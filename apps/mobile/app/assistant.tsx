import { useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
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
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { aiApi } from "@/lib/domain-api";
import { useMyPlans, useMyProfile, useTrainerClients } from "@/lib/query-hooks";
import { isMobileFeatureEnabled } from "@/lib/runtime-mode";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  body: string;
};

const memberPrompts = [
  "What should I focus on today?",
  "Make my workout easier to follow.",
  "What should I eat after training?",
];

const trainerPrompts = [
  "Draft a 4-week hypertrophy plan.",
  "Summarize this client's progress.",
  "Suggest safe exercise swaps.",
];

function starterMessage(isTrainer: boolean): ChatMessage {
  return {
    id: `hello-${isTrainer ? "trainer" : "member"}`,
    role: "assistant",
    body: isTrainer
      ? "Send a client summary, workout data, or a natural-language question. I can help draft plans, diet notes, and recovery guidance."
      : "Ask in any language. I can help with your assigned plans, diet preferences, recovery, and gym routine.",
  };
}

export default function AssistantScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const composerTranslateY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { activeOrgId, activeRole, hasAnyRole, token } = useAuth();
  const profileQuery = useMyProfile();
  const plansQuery = useMyPlans();
  const trainerClientsQuery = useTrainerClients();
  const isTrainer = hasAnyRole("TRAINER");
  const canUseAi = hasAnyRole("TRAINER", "MEMBER");
  const storageKey = `zook_assistant_messages_${activeOrgId ?? "global"}_${activeRole ?? "member"}`;
  const hydratedRef = useRef(false);
  const [messages, setMessages] = useState<ChatMessage[]>([starterMessage(isTrainer)]);
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
        firstClient?.user?.name ? `Client: ${firstClient.user.name}` : null,
        firstClient?.summary?.fitnessGoal ? `Goal: ${firstClient.summary.fitnessGoal}` : null,
        firstClient?.summary?.weightKg ? `Weight: ${firstClient.summary.weightKg} kg` : null,
        firstClient?.summary?.dietPreference ? `Diet: ${firstClient.summary.dietPreference}` : null,
        firstClient?.summary?.allergies ? `Allergies: ${firstClient.summary.allergies}` : null,
        firstClient?.summary?.activePlans
          ? `Active plans: ${firstClient.summary.activePlans}`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : [
        profile?.user?.fitnessGoal ? `Goal: ${profile.user.fitnessGoal}` : null,
        profile?.wellness?.weightKg ? `Weight: ${profile.wellness.weightKg} kg` : null,
        profile?.wellness?.dietPreference ? `Diet: ${profile.wellness.dietPreference}` : null,
        profile?.wellness?.allergies ? `Allergies: ${profile.wellness.allergies}` : null,
        `Plans: ${plansCount}`,
      ]
        .filter(Boolean)
        .join("\n");

  useEffect(() => {
    hydratedRef.current = false;
    void getStoredValue(storageKey).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ChatMessage[];
          if (Array.isArray(parsed) && parsed.length) {
            setMessages(parsed.slice(-50));
          } else {
            setMessages([starterMessage(isTrainer)]);
          }
        } catch {
          setMessages([starterMessage(isTrainer)]);
          void deleteStoredValue(storageKey);
          showToast({
            title: "Assistant reset",
            message: "Saved messages were unreadable.",
            tone: "amber",
            haptic: "warning",
          });
        }
      } else {
        setMessages([starterMessage(isTrainer)]);
      }
      hydratedRef.current = true;
    });
  }, [isTrainer, storageKey]);

  useEffect(() => {
    if (!hydratedRef.current || !messages.length) {
      return;
    }
    void setStoredValue(storageKey, JSON.stringify(messages.slice(-50))).catch(() => {
      showToast({
        title: "Assistant not saved",
        message: "New messages may not be restored next time.",
        tone: "amber",
        haptic: "warning",
      });
    });
  }, [messages, storageKey]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardWillShow", (event) => {
      const lift = Math.max(0, event.endCoordinates.height - insets.bottom);
      Animated.timing(composerTranslateY, {
        toValue: -lift,
        duration: event.duration ?? 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSubscription = Keyboard.addListener("keyboardWillHide", (event) => {
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
  }, [composerTranslateY, insets.bottom]);

  async function copyMessage(message: ChatMessage) {
    if (message.role !== "assistant") {
      return;
    }
    await Clipboard.setStringAsync(message.body);
    setCopyStatus("Copied");
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
    setMessages([{ ...starterMessage(isTrainer), id: `hello-${Date.now()}` }]);
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

  const suggestedPrompts = isTrainer ? trainerPrompts : memberPrompts;
  const composerBottom = layout.bottomNavHeight + Math.max(insets.bottom, 12) + spacing.lg;
  const assistantEnabled = isMobileFeatureEnabled("AI_CHAT_ENABLED");

  if (!canUseAi) {
    return (
      <ZookScreen>
        <View style={styles.content}>
          <GlassCard variant="compact" contentStyle={styles.emptyContent}>
            <IconBubble icon="sparkles-outline" tone="neutral" size={42} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>Plan assistant</Text>
              <Text style={styles.emptyBody}>
                Owner and desk operations stay in the web dashboard.
              </Text>
            </View>
          </GlassCard>
        </View>
        <BottomNav />
      </ZookScreen>
    );
  }

  if (!assistantEnabled) {
    return (
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <MobileHeader
            eyebrow={isTrainer ? "Trainer assistant" : "Plan assistant"}
            title="AI Chat"
            subtitle="Training chat is being polished before it opens in the app."
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={21} color={colors.text} />
              </Pressable>
            }
            chip={
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonBadgeText}>Coming Soon!</Text>
              </View>
            }
            showProfileShortcut={false}
          />
          <GlassCard variant="compact" contentStyle={styles.emptyContent}>
            <IconBubble icon="sparkles-outline" tone="neutral" size={42} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>AI Chat is coming soon</Text>
              <Text style={styles.emptyBody}>
                Workouts, plans, and profile data stay available while we finish the assistant.
              </Text>
            </View>
          </GlassCard>
          <View style={styles.suggestionRow}>
            {suggestedPrompts.map((prompt) => (
              <View key={prompt} style={styles.suggestionChipDisabled}>
                <Text style={styles.suggestionText}>{prompt}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    );
  }

  return (
    <ZookScreen>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.lime}
            colors={[colors.lime]}
          />
        }
      >
        <MobileHeader
          eyebrow={isTrainer ? "Trainer assistant" : "Plan assistant"}
          title={isTrainer ? "Coach with context" : "Talk through training"}
          subtitle={
            isTrainer
              ? "Attach client summaries, import notes, draft plans."
              : "Ask in any language — answers are tied to your profile."
          }
          leading={
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.iconButton}
            >
              <Ionicons name="chevron-back" size={21} color={colors.text} />
            </Pressable>
          }
          chip={
            <View style={styles.aiMark}>
              <Ionicons name="sparkles" size={18} color={colors.bg} />
            </View>
          }
          showProfileShortcut={false}
        />

        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setAttachSummary((value) => !value)}
            style={[styles.controlChip, attachSummary ? styles.controlChipActive : null]}
            accessibilityRole="button"
            accessibilityLabel="Attach summary"
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={attachSummary ? colors.bg : colors.muted}
            />
            <Text
              style={[styles.controlChipText, attachSummary ? styles.controlChipTextActive : null]}
            >
              {isTrainer ? "Client data" : "My profile"}
            </Text>
          </Pressable>
          <Pressable
            onPress={resetConversation}
            style={styles.controlChip}
            accessibilityRole="button"
            accessibilityLabel="Clear conversation"
          >
            <Ionicons name="refresh-outline" size={16} color={colors.muted} />
            <Text style={styles.controlChipText}>Clear</Text>
          </Pressable>
          {copyStatus ? <Text style={styles.copyStatus}>{copyStatus}</Text> : null}
        </View>

        {messages.length <= 1 ? (
          <View style={styles.suggestionRow}>
            {suggestedPrompts.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => setDraft(prompt)}
                accessibilityRole="button"
                style={styles.suggestionChip}
              >
                <Text style={styles.suggestionText}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {attachSummary && contextSummary ? (
          <GlassCard variant="compact" contentStyle={styles.contextContent}>
            <View style={styles.contextHeader}>
              <IconBubble icon="person-outline" tone="blue" size={32} />
              <Text style={styles.contextLabel}>
                {isTrainer ? "Attached client data" : "Attached profile"}
              </Text>
            </View>
            <Text style={styles.contextText}>{contextSummary}</Text>
          </GlassCard>
        ) : null}

        <View style={styles.chatStack}>
          {messages.map((message) => (
            <Pressable
              key={message.id}
              onLongPress={() => void copyMessage(message)}
              accessibilityRole={message.role === "assistant" ? "button" : undefined}
              accessibilityHint={message.role === "assistant" ? "Long press to copy" : undefined}
              style={[
                styles.messageBubble,
                message.role === "user" ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              {message.role === "assistant" ? (
                <View style={styles.assistantIcon}>
                  <Ionicons name="sparkles" size={14} color={colors.lime} />
                </View>
              ) : null}
              <Text style={[styles.messageText, message.role === "user" ? styles.userText : null]}>
                {message.body}
              </Text>
            </Pressable>
          ))}
          {loading ? (
            <View style={[styles.messageBubble, styles.assistantBubble]}>
              <View style={styles.assistantIcon}>
                <Ionicons name="sparkles" size={14} color={colors.lime} />
              </View>
              <Text style={styles.typingText}>Thinking...</Text>
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
        <GlassCard contentStyle={styles.composerContent}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask in any language..."
            placeholderTextColor={colors.subtle}
            multiline
            style={styles.input}
            onFocus={() =>
              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)
            }
          />
          <View style={styles.composerActions}>
            {draft.trim() ? (
              <Pressable
                onPress={() => setDraft("")}
                accessibilityRole="button"
                accessibilityLabel="Clear"
                style={styles.clearButton}
              >
                <Ionicons name="close" size={16} color={colors.muted} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => void askAssistant()}
              disabled={!draft.trim() || loading}
              accessibilityRole="button"
              accessibilityLabel="Send"
              style={[
                styles.sendButton,
                !draft.trim() || loading ? styles.sendButtonDisabled : null,
              ]}
            >
              <Ionicons
                name="send"
                size={18}
                color={!draft.trim() || loading ? colors.subtle : colors.bg}
              />
            </Pressable>
          </View>
        </GlassCard>
      </Animated.View>
      <BottomNav />
    </ZookScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding + 92,
  },
  aiMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lime,
  },
  comingSoonBadge: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.limeBorder,
    backgroundColor: "rgba(185,244,85,0.14)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  comingSoonBadgeText: {
    color: colors.lime,
    ...typography.caption,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
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
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: "flex-start",
  },
  controlChipActive: {
    borderColor: colors.lime,
    backgroundColor: colors.lime,
  },
  controlChipText: {
    color: colors.muted,
    ...typography.caption,
  },
  controlChipTextActive: {
    color: colors.bg,
  },
  copyStatus: {
    color: colors.lime,
    ...typography.small,
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionChipDisabled: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.03)",
    opacity: 0.7,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionText: {
    color: colors.text,
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
    color: colors.blue,
    ...typography.caption,
  },
  contextText: {
    color: colors.muted,
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
    backgroundColor: colors.glassFill,
    borderColor: colors.glassStroke,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  assistantIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(185,244,85,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  messageText: {
    color: colors.text,
    ...typography.body,
  },
  userText: {
    color: colors.bg,
    ...typography.bodyStrong,
  },
  typingText: {
    color: colors.muted,
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
    color: colors.text,
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
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.06)",
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
    color: colors.text,
    ...typography.cardTitle,
  },
  emptyBody: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
  comingSoonCta: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: colors.lime,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  comingSoonCtaText: {
    color: colors.ink,
    ...typography.bodyStrong,
  },
});
