import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Pill, PrimaryButton, Screen } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Profile() {
  const { activeOrgId, logout, session, setActiveOrgId } = useAuth();
  const activeOrganization =
    session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
    session?.activeOrganization;
  const initials =
    session?.user.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "Z";

  return (
    <Screen title="Profile">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.title} selectable>
            {session?.user.name ?? "Zook member"}
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
          <Text style={styles.body} selectable>
            Active gym: {activeOrganization?.name ?? "No active organization selected"}
          </Text>
          <View style={styles.orgList}>
            {session?.organizations.map((organization) => (
              <Pressable
                key={organization.orgId}
                onPress={() => void setActiveOrgId(organization.orgId)}
                style={[
                  styles.orgButton,
                  organization.orgId === activeOrganization?.orgId ? styles.orgButtonActive : undefined
                ]}
              >
                <Text style={styles.orgName}>{organization.name}</Text>
                <Text style={styles.orgMeta}>
                  {organization.city} · {organization.roles.join(", ")}
                </Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton onPress={() => void logout()}>Logout</PrimaryButton>
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
  body: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  orgList: {
    gap: 10,
    marginVertical: 14
  },
  orgButton: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 14
  },
  orgButtonActive: {
    borderColor: "rgba(185,244,85,0.32)"
  },
  orgName: {
    color: colors.text,
    fontWeight: "800"
  },
  orgMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6
  }
});
