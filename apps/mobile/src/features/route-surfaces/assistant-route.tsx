import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Card,
  IconBubble,
  AppHeader,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { aiApi } from "@/lib/domain-api";
import { type TranslationKey, useI18n } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { useMyPlans, useMyProfile, useTrainerClients } from "@/lib/domains";
import { isMobileFeatureEnabled } from "@/lib/runtime-mode";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  body: string;
};

const memberPromptKeys: TranslationKey[] = [
  "assistant.memberPromptFocus",
  "assistant.memberPromptWorkout",
  "assistant.memberPromptFood",
];

const trainerPromptKeys: TranslationKey[] = [
  "assistant.trainerPromptPlan",
  "assistant.trainerPromptSummary",
  "assistant.trainerPromptSwaps",
];

function starterMessage(isTrainer: boolean, t: (key: TranslationKey) => string): ChatMessage {
  return {
    id: `hello-${isTrainer ? "trainer" : "member"}`,
    role: "assistant",
    body: isTrainer ? t("assistant.trainerStarter") : t("assistant.memberStarter"),
  };
}

function homeRouteForRole(role: string) {
  if (role === "TRAINER") return "/trainer";
  if (role === "OWNER" || role === "ADMIN") return "/owner";
  if (role === "RECEPTIONIST") return "/reception";
  return "/";
}

export default function AssistantScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { palette, mode } = useTheme();
  const isDark = mode === "dark";
  const quietSurface = palette.surface.default;
  const quietPressedSurface = isDark ? palette.surface.raised : palette.bg.sunken;
  const chipSurface = palette.surface.default;
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const composerTranslateY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { activeOrgId, token } = useAuth();
  const roleContext = useRoleContext();
  const profileQuery = useMyProfile();
  const plansQuery = useMyPlans();
  const activeRole = roleContext?.role ?? "MEMBER";
  // Use the ACTIVE role, not merely available roles — a member who can also
  // train shouldn't see trainer prompts/copy while acting as a member.
  const isTrainer = activeRole === "TRAINER";
  const trainerClientsQuery = useTrainerClients(undefined, undefined, isTrainer);
  const canUseAi = Boolean(
    roleContext?.availableRoles.some((role) => role === "TRAINER" || role === "MEMBER"),
  );
  const assistantEnabled = isMobileFeatureEnabled("AI_CHAT_ENABLED");
  const fallbackRoute = homeRouteForRole(activeRole);
  const storageKey = `zook_assistant_messages_${activeOrgId ?? "global"}_${activeRole ?? "member"}`;
  const hydratedRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage(isTrainer, t)]);
  const [draft, setDraft] = useState("");
  const [attachSummary, setAttachSummary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const plansCount = plansQuery.data?.plans?.length ?? 0;
  const firstClient = trainerClientsQuery.data?.clients?.[0];
  const profile = profileQuery.data;
  const contextSummary = isTrainer
    ? [
        firstClient?.user?.name ? `${t("assistant.contextClient")}: ${firstClient.user.name}` : null,
        firstClient?.summary?.fitnessGoal
          ? `${t("assistant.contextGoal")}: ${firstClient.summary.fitnessGoal}`
          : null,
        firstClient?.summary?.weightKg
          ? `${t("assistant.contextWeight")}: ${firstClient.summary.weightKg} kg`
          : null,
        firstClient?.summary?.dietPreference
          ? `${t("assistant.contextDiet")}: ${firstClient.summary.dietPreference}`
          : null,
        firstClient?.summary?.allergies
          ? `${t("assistant.contextAllergies")}: ${firstClient.summary.allergies}`
          : null,
        firstClient?.summary?.activePlans
          ? `${t("assistant.contextActivePlans")}: ${firstClient.summary.activePlans}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : [
        profile?.user?.fitnessGoal ? `${t("assistant.contextGoal")}: ${profile.user.fitnessGoal}` : null,
        profile?.wellness?.weightKg
          ? `${t("assistant.contextWeight")}: ${profile.wellness.weightKg} kg`
          : null,
        profile?.wellness?.dietPreference
          ? `${t("assistant.contextDiet")}: ${profile.wellness.dietPreference}`
          : null,
        profile?.wellness?.allergies
          ? `${t("assistant.contextAllergies")}: ${profile.wellness.allergies}`
          : null,
        `${t("assistant.contextPlans")}: ${plansCount}`,
      ]
        .filter(Boolean)
        .join("\n");

  useEffect(() => {
    if (!assistantEnabled) {
      router.replace(fallbackRoute as never);
    }
  }, [assistantEnabled, fallbackRoute, router]);

  useEffect(() => {
    if (!assistantEnabled) {
      return;
    }
    hydratedRef.current = false;
    void getStoredValue(storageKey).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ChatMessage[];
          if (Array.isArray(parsed) && parsed.length) {
            setMessages(parsed.slice(-50));
          } else {
            setMessages([starterMessage(isTrainer, t)]);
          }
        } catch {
          setMessages([starterMessage(isTrainer, t)]);
          void deleteStoredValue(storageKey);
          showToast({
            title: t("assistant.resetToastTitle"),
            message: t("assistant.resetToastBody"),
            tone: "amber",
            haptic: "warning",
          });
        }
      } else {
        setMessages([starterMessage(isTrainer, t)]);
      }
      hydratedRef.current = true;
    });
  }, [assistantEnabled, isTrainer, storageKey, t]);

  useEffect(() => {
    if (!assistantEnabled || !hydratedRef.current || !messages.length) {
      return;
    }
    void setStoredValue(storageKey, JSON.stringify(messages.slice(-50))).catch(() => {
      showToast({
        title: t("assistant.notSavedToastTitle"),
        message: t("assistant.notSavedToastBody"),
        tone: "amber",
        haptic: "warning",
      });
    });
  }, [assistantEnabled, messages, storageKey, t]);

  useEffect(() => {
    if (!assistantEnabled) {
      return undefined;
    }
    const keyboardShowEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const keyboardHideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(keyboardShowEvent, (event) => {
      const lift = Math.max(0, event.endCoordinates.height - insets.bottom);
      Animated.timing(composerTranslateY, {
        toValue: -lift,
        duration: event.duration ?? 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSubscription = Keyboard.addListener(keyboardHideEvent, (event) => {
      Animated.timing(composerTranslateY, {
        toValue: 0,
        duration: event.duration ?? 250,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [assistantEnabled, composerTranslateY, insets.bottom]);

  async function copyMessage(message: ChatMessage) {
    if (message.role !== "assistant") {
      return;
    }
    await Clipboard.setStringAsync(message.body);
    setCopyStatus(t("assistant.copied"));
    setTimeout(() => setCopyStatus(""), 1400);
  }

  async function askAssistant(override?: string) {
    const prompt = (override ?? draft).trim();
    if (!token || !prompt || loading) {
      return;
    }
    const outboundPrompt =
      attachSummary && contextSummary ? `${contextSummary}\n\nQuestion: ${prompt}` : prompt;
    const nextUserMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", body: prompt };
    setMessages((current) => [...current, nextUserMessage]);
    setDraft("");
    setLoading(true);

    // Scroll to bottom after adding user message
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const result = await aiApi.chat<{ response: string | Record<string, unknown> }>({
        token,
        role: activeRole === "TRAINER" ? "TRAINER" : "MEMBER",
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        prompt: outboundPrompt,
      });
      const body =
        typeof result.response === "string" ? result.response : JSON.stringify(result.response);
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, role: "assistant", body },
      ]);
      await queryClient.invalidateQueries({ queryKey: ["me", "plans"] });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: `assistant-error-${Date.now()}`, role: "assistant", body: getApiErrorMessage(error) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    setMessages([{ ...starterMessage(isTrainer, t), id: `hello-${Date.now()}` }]);
    setDraft("");
    setCopyStatus("");
    void deleteStoredValue(storageKey);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "profile"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "plans"] }),
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "trainer"] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const suggestedPrompts = (isTrainer ? trainerPromptKeys : memberPromptKeys).map((key) => t(key));
  const composerBottom = layout.bottomNavHeight + Math.max(insets.bottom, 12) + spacing.lg;
  if (!assistantEnabled) {
    return null;
  }

  if (!canUseAi) {
    return (
      <ZookScreen testID="assistant-unavailable-screen">
        <View style={styles.content}>
          <Card variant="compact" contentStyle={styles.emptyContent}>
            <IconBubble icon="chatbubble-ellipses-outline" tone="neutral" size={42} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>{t("assistant.unavailableTitle")}</Text>
              <Text style={styles.emptyBody}>
                {t("assistant.unavailableBody")}
              </Text>
            </View>
          </Card>
        </View>
      </ZookScreen>
    );
  }

  return (
    <ZookScreen testID="assistant-screen">
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
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
      >
        <AppHeader
          eyebrow={isTrainer ? t("assistant.trainerEyebrow") : t("assistant.memberEyebrow")}
          title={isTrainer ? t("assistant.trainerTitle") : t("assistant.memberTitle")}
          subtitle={
            isTrainer
              ? t("assistant.trainerSubtitle")
              : t("assistant.memberSubtitle")
          }
          leading={
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              style={({ pressed }) => [
                styles.iconButton,
                {
                  borderColor: palette.border.subtle,
                  backgroundColor: quietSurface,
                },
                pressed ? styles.controlPressed : null,
              ]}
            >
              <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
            </Pressable>
          }
          showProfileShortcut={false}
          chip={
            <View style={[styles.aiMark, { backgroundColor: palette.accent.fill }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color={palette.text.onAccent} />
            </View>
          }
        />

        <View style={styles.controlsRow}>
          <Pressable
            testID="assistant-attach-summary"
            onPress={() => setAttachSummary((value) => !value)}
            style={({ pressed }) => [
              styles.controlChip,
              {
                borderColor: attachSummary ? palette.accent.base : palette.border.subtle,
                backgroundColor: attachSummary
                  ? palette.accent.fill
                  : chipSurface,
              },
              pressed ? styles.controlPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("assistant.attachSummary")}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={attachSummary ? palette.text.onAccent : palette.text.secondary}
            />
            <Text
              style={[
                styles.controlChipText,
                { color: attachSummary ? palette.text.onAccent : palette.text.secondary },
              ]}
            >
              {isTrainer ? t("assistant.clientData") : t("assistant.myProfile")}
            </Text>
          </Pressable>
          <Pressable
            testID="assistant-clear-conversation"
            onPress={resetConversation}
            style={({ pressed }) => [
              styles.controlChip,
              {
                borderColor: palette.border.subtle,
                backgroundColor: chipSurface,
              },
              pressed ? styles.controlPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t("assistant.clearConversation")}
          >
            <Ionicons name="refresh-outline" size={16} color={palette.text.secondary} />
            <Text style={[styles.controlChipText, { color: palette.text.secondary }]}>
              {t("assistant.clear")}
            </Text>
          </Pressable>
          {copyStatus ? <Text style={[styles.copyStatus, { color: palette.accent.base }]}>{copyStatus}</Text> : null}
        </View>

        {messages.length <= 1 ? (
          <View style={styles.suggestionRow}>
            {suggestedPrompts.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => setDraft(prompt)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.suggestionChip,
                  {
                    borderColor: palette.border.subtle,
                    backgroundColor: chipSurface,
                  },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Text style={[styles.suggestionText, { color: palette.text.primary }]}>
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {attachSummary && contextSummary ? (
          <Card variant="compact" contentStyle={styles.contextContent}>
            <View style={styles.contextHeader}>
              <IconBubble icon="person-outline" tone="neutral" size={32} />
              <Text style={[styles.contextLabel, { color: palette.text.secondary }]}>
                {isTrainer ? t("assistant.attachedClientData") : t("assistant.attachedProfile")}
              </Text>
            </View>
            <Text style={[styles.contextText, { color: palette.text.secondary }]}>
              {contextSummary}
            </Text>
          </Card>
        ) : null}

        <View style={styles.chatStack}>
          {messages.map((message, index) => (
            <Pressable
              key={message.id}
              testID={
                index === messages.length - 1
                  ? `assistant-message-${message.role}-latest`
                  : `assistant-message-${message.role}-${index}`
              }
              onLongPress={() => void copyMessage(message)}
              accessibilityRole={message.role === "assistant" ? "button" : undefined}
              accessibilityHint={message.role === "assistant" ? t("assistant.copyHint") : undefined}
              style={[
                styles.messageBubble,
                message.role === "user"
                  ? [
                      styles.userBubble,
                      { backgroundColor: palette.accent.fill, borderColor: palette.accent.fill },
                    ]
                  : [
                      styles.assistantBubble,
                      {
                        backgroundColor: palette.surface.default,
                        borderColor: palette.border.subtle,
                      },
                    ],
              ]}
            >
              {message.role === "assistant" ? (
                <View
                  style={[
                    styles.assistantIcon,
                    { borderColor: palette.accent.base, backgroundColor: palette.surface.accentSoft },
                  ]}
                >
                  <Ionicons name="chatbubble-ellipses" size={14} color={palette.accent.base} />
                </View>
              ) : null}
              <Text
                style={[
                  styles.messageText,
                  {
                    color:
                      message.role === "user" ? palette.text.onAccent : palette.text.primary,
                  },
                  message.role === "user" ? styles.userText : null,
                ]}
              >
                {message.body}
              </Text>
            </Pressable>
          ))}
          {loading ? (
            <View
              style={[
                styles.messageBubble,
                styles.assistantBubble,
                { backgroundColor: palette.surface.default, borderColor: palette.border.subtle },
              ]}
            >
              <View
                style={[
                  styles.assistantIcon,
                  { borderColor: palette.accent.base, backgroundColor: palette.surface.accentSoft },
                ]}
              >
                <Ionicons name="chatbubble-ellipses" size={14} color={palette.accent.base} />
              </View>
              <Text style={[styles.typingText, { color: palette.text.secondary }]}>
                {t("assistant.thinking")}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
      <Animated.View
        style={[
          styles.stickyComposer,
          { bottom: composerBottom, transform: [{ translateY: composerTranslateY }] },
        ]}
      >
        <Card contentStyle={styles.composerContent}>
          <TextInput
            testID="assistant-message-input"
            value={draft}
            onChangeText={setDraft}
            placeholder={t("assistant.inputPlaceholder")}
            placeholderTextColor={palette.text.tertiary}
            multiline
            style={[styles.input, { color: palette.text.primary }]}
            onFocus={() =>
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)
            }
          />
          <View style={styles.composerActions}>
            {draft.trim() ? (
              <Pressable
                testID="assistant-clear-draft"
                onPress={() => setDraft("")}
                accessibilityRole="button"
                accessibilityLabel={t("assistant.clear")}
                style={({ pressed }) => [
                  styles.clearButton,
                  {
                    borderColor: palette.border.subtle,
                    backgroundColor: quietPressedSurface,
                  },
                  pressed ? styles.controlPressed : null,
                ]}
              >
                <Ionicons name="close" size={16} color={palette.text.secondary} />
              </Pressable>
            ) : null}
            <Pressable
              testID="assistant-send-message"
              onPress={() => void askAssistant()}
              disabled={!draft.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel={t("assistant.send")}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: palette.accent.fill },
                pressed && draft.trim() && !loading ? styles.controlPressed : null,
                !draft.trim() || loading ? styles.sendButtonDisabled : null,
              ]}
            >
              <Ionicons
                name="send"
                size={18}
                color={!draft.trim() || loading ? palette.text.tertiary : palette.text.onAccent}
              />
            </Pressable>
          </View>
        </Card>
      </Animated.View>
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding + 92,
  },
  aiMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  controlPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  controlChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  controlChipText: {
    ...typography.caption,
  },
  copyStatus: {
    ...typography.small,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    minHeight: 40,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionText: {
    ...typography.small,
  },
  contextContent: {
    gap: spacing.sm,
  },
  contextHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  contextLabel: {
    ...typography.caption,
  },
  contextText: {
    ...typography.body,
  },
  chatStack: {
    gap: 8,
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    gap: 6,
  },
  assistantBubble: {
    alignSelf: "flex-start",
  },
  userBubble: {
    alignSelf: "flex-end",
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  messageText: {
    ...typography.body,
  },
  userText: {
    ...typography.bodyStrong,
  },
  typingText: {
    ...typography.body,
    fontStyle: "italic",
  },
  composerContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  stickyComposer: {
    position: "absolute",
    left: layout.screenPadding,
    right: layout.screenPadding,
    zIndex: 25,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    ...typography.body,
    textAlignVertical: "top",
  },
  composerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 2,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    ...typography.cardTitle,
  },
  emptyBody: {
    ...typography.body,
    textAlign: "center",
  },
});
