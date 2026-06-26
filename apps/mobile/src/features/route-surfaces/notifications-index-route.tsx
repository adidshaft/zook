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
  Card,
  EmptyState,
  IconBubble,
  AppHeader,
  QueryErrorState,
  ZookScreen,
} from "@/components/primitives";
import { NotificationsSkeleton } from "@/components/skeletons";
import { useAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/domain-api";
import { formatRelativeDate } from "@/lib/formatting";
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

type InboxNotification = {
  id: string;
  readAt?: string | null;
  deliveredAt?: string | null;
  notification?: {
    id?: string | null;
    title?: string | null;
    body?: string | null;
    type?: string | null;
    status?: string | null;
    createdAt?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
};

function iconForType(type?: string | null): keyof typeof Ionicons.glyphMap {
  if (type === "SECURITY") return "shield-outline";
  if (type === "PLAN") return "barbell-outline";
  if (type === "OPERATIONAL") return "settings-outline";
  if (type === "TRANSACTIONAL") return "card-outline";
  if (type === "ENGAGEMENT") return "heart-outline";
  return "notifications-outline";
}

function toneForType(type?: string | null) {
  if (type === "SECURITY") return "red" as const;
  if (type === "PLAN") return "blue" as const;
  if (type === "OPERATIONAL") return "amber" as const;
  if (type === "TRANSACTIONAL") return "lime" as const;
  return "violet" as const;
}

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
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const notificationsQuery = useMyNotifications();
  useAppFocusInvalidation([["me", "notifications"], ["me", "home"]]);
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const autoMarkedNotificationRef = useRef<string | null>(null);
  const detailSnapPoints = useMemo(() => ["38%", "72%"], []);
  const [busyIds, setBusyIds] = useState<Set<string>>(() => new Set());
  const [markAllBusy, setMarkAllBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [olderExpanded, setOlderExpanded] = useState(false);
  const notifications = useMemo(
    () => (notificationsQuery.data?.notifications ?? []) as InboxNotification[],
    [notificationsQuery.data?.notifications],
  );
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const latestLabel = notifications[0]?.notification?.createdAt
    ? formatRelativeDate(notifications[0].notification.createdAt)
    : null;
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
            <View style={{ gap: 14, marginBottom: 14 }}>
              <AppHeader
                title={t("nav.inbox")}
                subtitle={
                  unreadCount > 0
                    ? t(latestLabel ? "notifications.unreadRecent" : "notifications.unreadCount", { count: unreadCount, date: latestLabel ?? "" })
                    : latestLabel
                      ? t("notifications.allCaughtUpRecent", { date: latestLabel })
                      : t("notifications.allCaughtUp")
                }
                leading={
                  <Pressable
                    onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                    accessibilityRole="button"
                    accessibilityLabel={t("shop.back")}
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
                      <Ionicons name="checkmark-done" size={18} color={palette.accent.base} />
                      <Text numberOfLines={1} style={[styles.markAllText, { color: palette.accent.base }]}>
                        {t("notifications.markAllRead")}
                      </Text>
                    </Pressable>
                  ) : null
                }
                showProfileShortcut={false}
              />

              {routeParams.notificationId ? (
                <Card variant="selected" contentStyle={styles.calloutContent}>
                  <IconBubble icon="notifications" tone="neutral" size={36} />
                  <Text style={[styles.calloutText, { color: palette.text.primary }]}>
                    {routeParams.focus === "attendance"
                      ? t("notifications.attendanceAlertReceived")
                      : t("notifications.openedFromPush")}
                  </Text>
                </Card>
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
                icon={iconForType(focusedNotification?.notification?.type)}
                tone={toneForType(focusedNotification?.notification?.type)}
                size={44}
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
          </BottomSheetScrollView>
        </BottomSheetModal>
      </ZookScreen>
    </>
  );
}

function NotificationRow({
  item,
  busy,
  first,
  highlighted,
  onPress,
}: {
  item: InboxNotification;
  busy: boolean;
  first: boolean;
  highlighted: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const { t } = useI18n();
  const notification = item.notification;
  const unread = !item.readAt;
  const type = notification?.type;
  const href = mapNotificationPayloadToHref({
    notificationId: notification?.id ?? item.id,
    type,
    ...(notification?.metadata ?? {}),
  });
  const opensRoute = !href.startsWith("/notifications");

  return (
    <Pressable
      testID={first ? "notification-row-first" : `notification-row-${item.id}`}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification?.title ?? t("notifications.fallbackTitle")}
      accessibilityState={{ busy }}
      style={({ pressed }) => [pressed ? styles.pressed : null]}
    >
      <Card
        variant={highlighted ? "selected" : unread ? "default" : "compact"}
        contentStyle={[
          styles.notificationContent,
          unread ? [styles.notificationUnreadContent, { borderLeftColor: palette.accent.base }] : styles.notificationReadContent,
        ]}
      >
        <View style={styles.notificationRow}>
          <IconBubble icon={iconForType(type)} tone={toneForType(type)} size={40} />
          <View style={styles.notificationCopy}>
            <View style={styles.notificationTitleRow}>
              <Text numberOfLines={2} style={[styles.notificationTitle, { color: palette.text.primary }]}>
                {notification?.title ?? t("notifications.fallbackTitle")}
              </Text>
              {unread ? (
                <View
                  testID={first ? "unread-dot-first" : `unread-dot-${item.id}`}
                  style={[styles.unreadDot, { backgroundColor: palette.accent.base }]}
                />
              ) : null}
            </View>
            <Text numberOfLines={2} style={[styles.notificationBody, { color: palette.text.secondary }]}>
              {notification?.body ?? t("notifications.noDetails")}
            </Text>
            <Text style={[styles.notificationTime, { color: palette.text.tertiary }]}>
              {notification?.createdAt ? formatRelativeDate(notification.createdAt) : ""}
              {busy ? t("notifications.openingSuffix") : ` · ${opensRoute ? t("notifications.openLinkedScreen") : t("notifications.markRead")}`}
            </Text>
          </View>
          <Ionicons
            name={opensRoute ? "chevron-forward" : "checkmark-circle-outline"}
            size={18}
            color={opensRoute ? palette.text.secondary : palette.accent.base}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 20,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  markAllButton: {
    minWidth: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  markAllText: {
    ...typography.caption,
  },
  calloutContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  calloutText: {
    flex: 1,
    ...typography.bodyStrong,
  },
  dateGroupLabel: {
    ...typography.caption,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  notificationContent: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  notificationUnreadContent: {
    borderLeftWidth: 3,
  },
  notificationReadContent: {
    opacity: 0.78,
  },
  notificationRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  notificationCopy: {
    flex: 1,
    gap: 4,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  notificationTitle: {
    flex: 1,
    ...typography.cardTitle,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationBody: {
    ...typography.body,
  },
  notificationTime: {
    ...typography.small,
    marginTop: 2,
  },
  showOlderButton: {
    minHeight: 44,
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
    gap: spacing.lg,
    padding: spacing.lg,
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
    ...typography.headerTitle,
  },
  detailTime: {
    ...typography.caption,
  },
  detailBody: {
    ...typography.body,
  },
});
