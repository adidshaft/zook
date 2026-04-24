import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryLink, Screen } from "@/components/primitives";
import { colors } from "@/lib/theme";

export default function Profile() {
  return (
    <Screen title="Profile">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>N</Text>
          </View>
          <Text style={styles.title} selectable>
            Nisha Member
          </Text>
          <Text style={styles.body} selectable>
            Profile photo consent granted for attendance verification. No face recognition in MVP.
          </Text>
        </Card>
        <Card>
          <Pill tone="amber">Privacy</Pill>
          <Text style={styles.title} selectable>
            Consents and account controls
          </Text>
          <Text style={styles.body} selectable>
            Marketing preferences, AI personalization consent, data export request, deletion request, guardian state.
          </Text>
          <PrimaryLink href="/login">Switch role / account</PrimaryLink>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: { color: colors.bg, fontWeight: "900", fontSize: 26 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 12 },
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 }
});
