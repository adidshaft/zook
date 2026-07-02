import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Constants from "expo-constants";
import type * as NotificationsModule from "expo-notifications";
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  EmptyState,
  IconBubble,
  ScreenHeader,
  QueryErrorState,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { NotificationsSkeleton } from "@/components/skeletons";
import {
  iconForNotificationType,
  NotificationRow,
  toneForNotificationType,
  type InboxNotification,
} from "@/features/notifications/notification-row";
import { useAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/domain-api";
import { useFormatters } from "@/lib/formatting-i18n";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { mapNotificationPayloadToHref } from "@/lib/notification-routing";
import { useMyNotifications } from "@/lib/domains";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useAppFocusInvalidation } from "@/lib/app-focus";

const NativeNotifications =
  Constants.executionEnvironment === "storeClient"
    ? null
    : (() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go crashes if this native module is imported eagerly.
          return require("expo-notifications") as typeof NotificationsModule;
        } catch {
          return null;
        }
      })();

function groupByDate(items: InboxNotification[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);
  const buckets = new Map<TranslationKey, InboxNotification[]>([
    ["notifications.today", []],
    ["notifications.yesterday", []],
    ["notifications.earlierThisWeek", []],
    ["notifications.older", []],
  ]);

  for (const item of items) {
    const createdAt = item.notification?.createdAt
      ? new Date(item.notification.createdAt)
      : new Date(0);
    if (createdAt >= startOfToday) buckets.get("notifications.today")?.push(item);
    else if (createdAt >= startOfYesterday) buckets.get("notifications.yesterday")?.push(item);
    else if (createdAt >= startOfWeek) buckets.get("notifications.earlierThisWeek")?.push(item);
    else buckets.get("notifications.older")?.push(item);
  }

  return Array.from(buckets.entries())
    .filter(([, bucketItems]) => bucketItems.length > 0)
    .map(([label, bucketItems]) => ({ label, items: bucketItems }));
}

export default function NotificationsScreen() {
  const routeParams = useLocalSearchParams<{ focus?: string; notificationId?: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { t } = useI18n();
  const { palette } = useTheme();
  const { formatRelativeDate } = useFormatters();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const notificationsQuery = useMyNotifications();
  useAppFocusInvalidation([["me", "notifications"], ["me", "home"]]);
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const autoMarkedNotificationRef = useRef<string | null>(null);
  const detailSnapPoints = useMemo(() => ["34%", "68%"], []);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [olderExpanded, setOlderExpanded] = useState(false);
  const notifications = useMemo(
    () => (notificationsQuery.data?.notifications ?? []) as InboxNotification[],
    [notificationsQuery.data?.notifications],
  );
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const focusedNotification = notifications.find(
    (item) =>
      item.id === routeParams.notificationId || item.notification?.id === routeParams.notificationId,
  );
  const renderDetailBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    [],
  );

  const markRead = useCallback(
    async (id: string) => {
      if (!token || busyIds.has(id)) {
        return;
      }
      const previous = queryClient.getQueryData<{ notifications: InboxNotification[] }>([
        "me",
        "notifications",
      ]);
      try {
        setBusyIds((current) => new Set(current).add(id));
        queryClient.setQueryData<{ notifications: InboxNotification[] }>(
          ["me", "notifications"],
          (current) => ({
            notifications:
              current?.notifications.map((item) =>
                item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item,
              ) ?? [],
          }),
        );
        await notificationsApi.markRead({ id, token });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        ]);
        showToast({ tone: "success", haptic: "success", message: t("notifications.markedRead") });
      } catch (error) {
        if (previous) {
          queryClient.setQueryData(["me", "notifications"], previous);
        }
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
          queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        ]);
        showToast({
          title: t("common.actionFailed"),
          message: error instanceof Error ? error.message : t("notifications.couldNotUpdate"),
          tone: "danger",
          haptic: "error",
        });
      } finally {
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
      }
    },
    [busyIds, queryClient, t, token],
  );

  async function markAllRead() {
    if (!token || markAllBusy) return;
    const unread = notifications.filter((item) => !item.readAt);
    if (!unread.length) {
      return;
    }
    const previous = queryClient.getQueryData<{ notifications: InboxNotification[] }>([
      "me",
      "notifications",
    ]);
    const now = new Date().toISOString();
    try {
      setMarkAllBusy(true);
      setBusyIds((current) => new Set([...current, ...unread.map((item) => item.id)]));
      queryClient.setQueryData<{ notifications: InboxNotification[] }>(
        ["me", "notifications"],
        (current) => ({
          notifications: current?.notifications.map((item) => ({ ...item, readAt: item.readAt ?? now })) ?? [],
        }),
      );
      await notificationsApi.markAllRead({ ids: unread.map((item) => item.id), token });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      showToast({ tone: "success", haptic: "success", message: t("notifications.allMarkedRead") });
    } catch (error) {
      if (previous) {
        queryClient.setQueryData(["me", "notifications"], previous);
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      showToast({
        title: t("common.actionFailed"),
        message: error instanceof Error ? error.message : t("notifications.couldNotUpdateMany"),
        tone: "danger",
        haptic: "error",
      });
    } finally {
      setMarkAllBusy(false);
      setBusyIds((current) => {
        const next = new Set(current);
        unread.forEach((item) => next.delete(item.id));
        return next;
      });
    }
  }

  async function openNotification(item: InboxNotification) {
    if (!item.readAt) {
      void markRead(item.id);
    }
    const href = mapNotificationPayloadToHref({
      notificationId: item.notification?.id ?? item.id,
      type: item.notification?.type,
      ...(item.notification?.metadata ?? {}),
    });
    if (!href.startsWith("/notifications")) {
      router.push(href as never);
      return;
    }
    router.push({
      pathname: "/notifications/[id]",
      params: { id: item.notification?.id ?? item.id },
    } as never);
  }

  useEffect(() => {
    if (!routeParams.notificationId) {
      return;
    }
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "notifications"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
    ]);
  }, [queryClient, routeParams.notificationId]);

  useEffect(() => {
    if (!routeParams.notificationId) {
      autoMarkedNotificationRef.current = null;
      return;
    }
    const matchingUnread = notifications.find(
      (item) =>
        (item.id === routeParams.notificationId || item.notification?.id === routeParams.notificationId) &&
        !item.readAt,
    );
    if (matchingUnread && autoMarkedNotificationRef.current !== matchingUnread.id) {
      autoMarkedNotificationRef.current = matchingUnread.id;
      void markRead(matchingUnread.id);
    }
  }, [markRead, notifications, routeParams.notificationId]);

  useEffect(() => {
    if (!focusedNotification) {
      detailSheetRef.current?.dismiss();
      return;
    }
    detailSheetRef.current?.present();
  }, [focusedNotification]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
    } finally {
      setRefreshing(false);
    }
  };

  function closeNotificationDetails() {
    detailSheetRef.current?.dismiss();
    router.replace("/notifications" as never);
  }

  function openFocusedNotificationTarget() {
    if (!focusedNotification) {
      closeNotificationDetails();
      return;
    }
    const href = mapNotificationPayloadToHref({
      notificationId: focusedNotification.notification?.id ?? focusedNotification.id,
      type: focusedNotification.notification?.type,
      ...(focusedNotification.notification?.metadata ?? {}),
    });
    if (!href.startsWith("/notifications")) {
      detailSheetRef.current?.dismiss();
      router.push(href as never);
      return;
    }
    closeNotificationDetails();
  }

  const focusedHref = focusedNotification
    ? mapNotificationPayloadToHref({
        notificationId: focusedNotification.notification?.id ?? focusedNotification.id,
        type: focusedNotification.notification?.type,
        ...(focusedNotification.notification?.metadata ?? {}),
      })
    : "/notifications";
  const focusedOpensRoute = !focusedHref.startsWith("/notifications");

  const dateGroups = useMemo(() => {
    return groupByDate(notifications).map((group) => {
      const displayItems =
        group.label === "notifications.older" && !olderExpanded
          ? group.items.slice(0, 3)
          : group.items;
      return {
        title: group.label,
        data: displayItems,
        originalCount: group.items.length,
      };
    });
  }, [notifications, olderExpanded]);

  useFocusEffect(
    useCallback(() => {
      void NativeNotifications?.setBadgeCountAsync(unreadCount).catch(() => undefined);
    }, [unreadCount]),
  );

  return (
    <>
      <ZookScreen testID="notifications-screen">
        <SectionList
          sections={dateGroups}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <NotificationRow
              item={item}
              first={index === 0}
              busy={busyIds.has(item.id)}
              highlighted={item.notification?.id === routeParams.notificationId}
              onPress={() => void openNotification(item)}
            />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={[styles.dateGroupLabel, { color: palette.text.secondary }]}>
              {t(title)}
            </Text>
          )}
          renderSectionFooter={({ section }) => {
            if (section.title === "notifications.older" && section.originalCount > 3) {
              return (
                <Pressable
                  onPress={() => setOlderExpanded((current) => !current)}
                  accessibilityRole="button"
                  accessibilityLabel={olderExpanded ? t("notifications.showFewerOlder") : t("notifications.showOlder")}
                  style={({ pressed }) => [styles.showOlderButton, pressed ? styles.pressed : null]}
                >
                  <Text style={[styles.showOlderText, { color: palette.accent.base }]}>
                    {olderExpanded ? t("notifications.showFewer") : t("notifications.showOlderCount", { count: section.originalCount - 3 })}
                  </Text>
                </Pressable>
              );
            }
            return null;
          }}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ScreenHeader
                title={t("nav.inbox")}
                subtitle={
                  unreadCount > 0
                    ? t("notifications.unreadCount", { count: unreadCount })
                    : t("notifications.allCaughtUp")
                }
                leading={
                  <Pressable
                    onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                    accessibilityRole="button"
                    accessibilityLabel={t("common.back")}
                    style={({ pressed }) => [
                      styles.iconButton,
                      {
                        borderColor: palette.border.subtle,
                        backgroundColor: palette.surface.default,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
                  </Pressable>
                }
                trailing={
                  unreadCount > 0 ? (
                    <Pressable
                      testID="notifications-mark-all-read"
                      onPress={() => void markAllRead()}
                      disabled={markAllBusy}
                      accessibilityRole="button"
                      accessibilityLabel={t("notifications.markAllRead")}
                      accessibilityState={{ busy: markAllBusy }}
                      style={({ pressed }) => [
                        styles.markAllButton,
                        {
                          borderColor: palette.accent.base,
                          backgroundColor: palette.surface.accentSoft,
                        },
                        pressed && !markAllBusy ? styles.pressed : null,
                      ]}
                    >
                      <Ionicons name="checkmark-done" size={17} color={palette.accent.base} />
                    </Pressable>
                  ) : null
                }
                showProfileShortcut={false}
              />

              {routeParams.notificationId ? (
                <View
                  style={[
                    styles.calloutContent,
                    {
                      backgroundColor: palette.bg.sunken,
                      borderColor: palette.border.subtle,
                    },
                  ]}
                >
                  <Ionicons name="notifications-outline" size={14} color={palette.text.secondary} />
                  <Text style={[styles.calloutText, { color: palette.text.primary }]}>
                    {routeParams.focus === "attendance"
                      ? t("notifications.attendanceAlertReceived")
                      : t("notifications.openedFromPush")}
                  </Text>
                </View>
              ) : null}

              {notificationsQuery.isLoading ? (
                <NotificationsSkeleton />
              ) : null}

              {notificationsQuery.isError ? (
                <QueryErrorState error={notificationsQuery.error} onRetry={() => void notificationsQuery.refetch()} />
              ) : null}

              {!notificationsQuery.isLoading && !notificationsQuery.isError && !notifications.length ? (
                <EmptyState icon="notifications-outline" title={t("notifications.emptyTitle")} body={t("notifications.emptyBody")} />
              ) : null}
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
          SectionSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
        <BottomSheetModal
          ref={detailSheetRef}
          snapPoints={detailSnapPoints}
          enablePanDownToClose
          backdropComponent={renderDetailBackdrop}
          backgroundStyle={StyleSheet.flatten([
            styles.sheetBackground,
            {
              backgroundColor: palette.bg.elevated,
              borderColor: palette.border.subtle,
            },
          ])}
          handleIndicatorStyle={StyleSheet.flatten([
            styles.sheetHandle,
            {
              backgroundColor: palette.border.strong,
            },
          ])}
          bottomInset={Math.max(insets.bottom, 12)}
        >
          <BottomSheetScrollView contentContainerStyle={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <IconBubble
                icon={iconForNotificationType(focusedNotification?.notification?.type)}
                tone={toneForNotificationType(focusedNotification?.notification?.type)}
                size={36}
              />
              <View style={styles.detailCopy}>
                <Text style={[styles.detailTitle, { color: palette.text.primary }]}>
                  {focusedNotification?.notification?.title ?? t("notifications.fallbackTitle")}
                </Text>
                <Text style={[styles.detailTime, { color: palette.text.secondary }]}>
                  {focusedNotification?.notification?.createdAt
                    ? formatRelativeDate(focusedNotification.notification.createdAt)
                    : ""}
                </Text>
              </View>
              <Pressable
                testID="notification-detail-close"
                onPress={closeNotificationDetails}
                accessibilityRole="button"
                accessibilityLabel={t("notifications.closeDetails")}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    borderColor: palette.border.subtle,
                    backgroundColor: palette.surface.default,
                  },
                  pressed ? styles.pressed : null,
                ]}
              >
                <Ionicons name="close" size={20} color={palette.text.primary} />
              </Pressable>
            </View>
            <Text style={[styles.detailBody, { color: palette.text.primary }]}>
              {focusedNotification?.notification?.body ?? t("notifications.noDetails")}
            </Text>
            <ZookButton
              testID="notification-detail-action"
              onPress={openFocusedNotificationTarget}
              icon={focusedOpensRoute ? "open-outline" : "checkmark-circle-outline"}
              fullWidth
            >
              {focusedOpensRoute ? t("notifications.openLinkedScreen") : t("notifications.done")}
            </ZookButton>
          </BottomSheetScrollView>
        </BottomSheetModal>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 18,
    gap: 7,
    paddingBottom: layout.bottomNavContentPadding,
  },
  listHeader: {
    gap: 8,
    marginBottom: 6,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  markAllButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calloutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 30,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  calloutText: {
    flex: 1,
    ...typography.caption,
  },
  dateGroupLabel: {
    ...typography.caption,
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  showOlderButton: {
    minHeight: 36,
    alignSelf: "flex-start",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  showOlderText: {
    ...typography.caption,
  },
  sheetBackground: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
  },
  sheetHandle: {},
  detailSheet: {
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  detailCopy: {
    flex: 1,
    gap: 2,
  },
  detailTitle: {
    ...typography.cardTitle,
  },
  detailTime: {
    ...typography.caption,
  },
  detailBody: {
    ...typography.small,
  },
});
