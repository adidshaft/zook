import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { aiApi } from "@/lib/domain-api";
import { useMyPlans, useMyProfile, useTrainerClients } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  body: string;
};

const languagePrompts = [
  { label: "English", prompt: "Build a simple plan for today's workout." },
  { label: "हिन्दी", prompt: "आज की workout planning आसान भाषा में समझाओ." },
  { label: "मराठी", prompt: "आजचा workout plan सोप्या भाषेत सांग." },
  { label: "தமிழ்", prompt: "இன்றைய workout-ஐ எளிமையாக திட்டமிடுங்கள்." },
];

export default function AssistantScreen() {
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const { activeOrgId, activeRole, hasAnyRole, token } = useAuth();
  const profileQuery = useMyProfile();
  const plansQuery = useMyPlans();
  const trainerClientsQuery = useTrainerClients();
  const isTrainer = hasAnyRole("TRAINER");
  const canUseAi = hasAnyRole("TRAINER", "MEMBER");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "hello",
      role: "assistant",
      body: isTrainer
        ? "Send a client summary, workout data, or a natural-language question. I can help draft plans, diet notes, and recovery guidance."
        : "Ask in any language. I can help with your assigned plans, diet preferences, recovery, and gym routine.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [attachSummary, setAttachSummary] = useState(false);
  const [loading, setLoading] = useState(false);

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
        firstClient?.summary?.activePlans ? `Active plans: ${firstClient.summary.activePlans}` : null,
      ].filter(Boolean).join("\n")
    : [
        profile?.user?.fitnessGoal ? `Goal: ${profile.user.fitnessGoal}` : null,
        profile?.wellness?.weightKg ? `Weight: ${profile.wellness.weightKg} kg` : null,
        profile?.wellness?.dietPreference ? `Diet: ${profile.wellness.dietPreference}` : null,
        profile?.wellness?.allergies ? `Allergies: ${profile.wellness.allergies}` : null,
        `Assigned plans: ${plansCount}`,
      ].filter(Boolean).join("\n");

  async function askAssistant(override?: string) {
    const prompt = (override ?? draft).trim();
    if (!token || !prompt || loading) {
      return;
    }
    const outboundPrompt = attachSummary && contextSummary ? `${contextSummary}\n\nQuestion: ${prompt}` : prompt;
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
      const body = typeof result.response === "string" ? result.response : JSON.stringify(result.response);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", body }]);
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

  if (!canUseAi) {
    return (
      <ZookScreen>
        <View style={styles.content}>
          <GlassCard variant="compact" contentStyle={styles.emptyContent}>
            <IconBubble icon="sparkles-outline" tone="neutral" size={42} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>AI for trainers and members</Text>
              <Text style={styles.emptyBody}>Owner and desk operations stay in the web dashboard.</Text>
            </View>
          </GlassCard>
        </View>
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
      >
        <MobileHeader
          eyebrow={isTrainer ? "Trainer AI" : "Plan assistant"}
          title={isTrainer ? "Coach with context" : "Talk through training"}
          subtitle={isTrainer
            ? "Attach client summaries, import notes, draft plans."
            : "Ask in any language — answers are tied to your profile."}
          leading={
            <View style={styles.aiMark}>
              <Ionicons name="sparkles" size={22} color={colors.bg} />
            </View>
          }
          showProfileShortcut={false}
        />

        {/* Controls bar */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => setAttachSummary((value) => !value)}
            style={[styles.controlChip, attachSummary ? styles.controlChipActive : null]}
            accessibilityRole="button"
            accessibilityLabel="Attach summary"
          >
            <Ionicons name="document-text-outline" size={16} color={attachSummary ? colors.bg : colors.muted} />
            <Text style={[styles.controlChipText, attachSummary ? styles.controlChipTextActive : null]}>
              {isTrainer ? "Client data" : "My profile"}
            </Text>
          </Pressable>
          <View style={styles.languageRow}>
            {languagePrompts.map((item) => (
              <Pressable
                key={item.label}
                onPress={() => setDraft(item.prompt)}
                accessibilityRole="button"
                style={styles.languageChip}
              >
                <Text style={styles.languageText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Attached context preview */}
        {attachSummary && contextSummary ? (
          <GlassCard variant="compact" contentStyle={styles.contextContent}>
            <View style={styles.contextHeader}>
              <IconBubble icon="person-outline" tone="blue" size={32} />
              <Text style={styles.contextLabel}>{isTrainer ? "Attached client data" : "Attached profile"}</Text>
            </View>
            <Text style={styles.contextText}>{contextSummary}</Text>
          </GlassCard>
        ) : null}

        {/* Chat messages */}
        <View style={styles.chatStack}>
          {messages.map((message) => (
            <View
              key={message.id}
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
            </View>
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

        {/* Composer */}
        <GlassCard contentStyle={styles.composerContent}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ask in any language..."
            placeholderTextColor={colors.subtle}
            multiline
            style={styles.input}
            onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200)}
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
              style={[styles.sendButton, (!draft.trim() || loading) ? styles.sendButtonDisabled : null]}
            >
              <Ionicons name="send" size={18} color={(!draft.trim() || loading) ? colors.subtle : colors.bg} />
            </Pressable>
          </View>
        </GlassCard>
      </ScrollView>
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
    paddingBottom: layout.bottomNavContentPadding,
  },
  aiMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lime,
  },
  controlsRow: {
    gap: spacing.sm,
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
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  languageText: {
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
});
