import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Card,
  Dock,
  EmptyState,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from "@/components/primitives";
import { mobileApiFetch } from "@/lib/api";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { useMyPlans, useMyProfile, useTrainerClients } from "@/lib/query-hooks";
import { colors, typography } from "@/lib/theme";

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
  const { activeOrgId, hasAnyRole, token } = useAuth();
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
  const [voiceMode, setVoiceMode] = useState(false);
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
    try {
      const result = await mobileApiFetch<{ response: string | Record<string, unknown> }>("/ai/chat", {
        method: "POST",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          prompt: outboundPrompt,
          ...(activeOrgId ? { orgId: activeOrgId } : {}),
        },
      });
      const body = typeof result.response === "string" ? result.response : JSON.stringify(result.response);
      setMessages((current) => [...current, { id: `assistant-${Date.now()}`, role: "assistant", body }]);
      await queryClient.invalidateQueries({ queryKey: ["me", "plans"] });
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: `assistant-error-${Date.now()}`, role: "assistant", body: getApiErrorMessage(error) },
      ]);
    } finally {
      setLoading(false);
      setVoiceMode(false);
    }
  }

  if (!canUseAi) {
    return (
      <Screen>
        <View style={styles.content}>
          <EmptyState
            title="AI is available for trainers and members"
            body="Owner and desk operations stay in the web dashboard."
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.aiMark}>
              <Ionicons name="sparkles" size={26} color={colors.bg} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>{isTrainer ? "Trainer AI" : "Plan assistant"}</Text>
              <Text style={styles.heroTitle}>{isTrainer ? "Coach with context." : "Talk through training."}</Text>
              <Text style={styles.heroBody}>
                {isTrainer
                  ? "Attach client summaries, import notes, and turn natural language into usable plans."
                  : "Use text or voice-style prompts in any language and keep the answer tied to your profile."}
              </Text>
            </View>
          </View>

          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setVoiceMode((value) => !value)}
              style={[styles.modeChip, voiceMode ? styles.modeChipActive : null]}
            >
              <Ionicons name={voiceMode ? "mic" : "mic-outline"} size={18} color={voiceMode ? colors.bg : colors.text} />
              <Text style={[styles.modeChipText, voiceMode ? styles.modeChipTextActive : null]}>
                {voiceMode ? "Listening" : "Audio"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setAttachSummary((value) => !value)}
              style={[styles.modeChip, attachSummary ? styles.modeChipActive : null]}
            >
              <Ionicons name="document-text-outline" size={18} color={attachSummary ? colors.bg : colors.text} />
              <Text style={[styles.modeChipText, attachSummary ? styles.modeChipTextActive : null]}>
                {isTrainer ? "Client summary" : "My summary"}
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.languageRow}>
          {languagePrompts.map((item) => (
            <Pressable key={item.label} onPress={() => setDraft(item.prompt)} style={styles.languageChip}>
              <Text style={styles.languageText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {attachSummary && contextSummary ? (
          <Card style={styles.contextCard}>
            <Pill tone="blue">{isTrainer ? "Attached client data" : "Attached member data"}</Pill>
            <Text style={styles.contextText}>{contextSummary}</Text>
          </Card>
        ) : null}

        <View style={styles.chatStack}>
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.role === "user" ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={[styles.messageText, message.role === "user" ? styles.userText : null]}>
                {message.body}
              </Text>
            </View>
          ))}
        </View>

        <Card style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={voiceMode ? "Say it naturally..." : "Ask in any language..."}
            placeholderTextColor={colors.muted}
            multiline
            style={styles.input}
          />
          <View style={styles.composerActions}>
            <SecondaryButton onPress={() => setDraft("")} style={styles.actionHalf}>
              Clear
            </SecondaryButton>
            <PrimaryButton onPress={() => void askAssistant()} disabled={!draft.trim() || loading} style={styles.actionHalf}>
              {loading ? "Thinking" : "Send"}
            </PrimaryButton>
          </View>
        </Card>
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 124,
  },
  hero: {
    gap: 18,
    padding: 20,
    backgroundColor: "rgba(185,244,85,0.09)",
    borderColor: "rgba(185,244,85,0.22)",
  },
  heroTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  aiMark: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.lime,
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    color: colors.amber,
    ...typography.eyebrow,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 35,
    fontWeight: "900",
  },
  heroBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modeChipActive: {
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  modeChipText: {
    color: colors.text,
    fontWeight: "800",
  },
  modeChipTextActive: {
    color: colors.bg,
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  languageChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  languageText: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 12,
  },
  contextCard: {
    gap: 10,
    backgroundColor: "rgba(125,211,252,0.08)",
    borderColor: "rgba(125,211,252,0.18)",
  },
  contextText: {
    color: colors.text,
    lineHeight: 20,
  },
  chatStack: {
    gap: 10,
  },
  messageBubble: {
    maxWidth: "88%",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderWidth: 1,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.panel,
    borderColor: colors.border,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.lime,
    borderColor: colors.lime,
  },
  messageText: {
    color: colors.text,
    lineHeight: 21,
  },
  userText: {
    color: colors.bg,
    fontWeight: "800",
  },
  composer: {
    gap: 12,
  },
  input: {
    minHeight: 96,
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: "top",
  },
  composerActions: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});
