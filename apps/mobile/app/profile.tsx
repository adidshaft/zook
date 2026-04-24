import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  Card,
  InfoRow,
  MetricTile,
  Pill,
  PrimaryButton,
  Screen,
  ScreenHeader,
  SectionHeader,
  SecondaryLink,
} from "@/components/primitives";
import { titleCaseFromCode } from "@/lib/formatting";
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
  const allRoles = Array.from(
    new Set(session?.organizations.flatMap((organization) => organization.roles) ?? []),
  );

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ScreenHeader
          eyebrow="Account"
          title={session?.user.name ?? "Zook member"}
          subtitle="Switch gyms, review consent state, and keep your account controls visible without leaving the mobile flow."
        />

        <Card style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileCopy}>
              <Text style={styles.profileName} selectable>
                {session?.user.email ?? "No email"}
              </Text>
              <Text style={styles.profileBody} selectable>
                {session?.user.phone ?? "Phone not added yet"}
              </Text>
            </View>
          </View>
          <View style={styles.roleRow}>
            {allRoles.length ? (
              allRoles.map((role) => (
                <Pill key={role} tone={role === "MEMBER" ? "lime" : "blue"}>
                  {titleCaseFromCode(role)}
                </Pill>
              ))
            ) : (
              <Pill tone="neutral">Member</Pill>
            )}
          </View>
          <Text style={styles.profileBody} selectable>
            Profile photo consent is used for attendance verification only. Face recognition stays
            out of scope in the current mobile build.
          </Text>
        </Card>

        <View style={styles.metricGrid}>
          <MetricTile
            label="Organizations"
            value={String(session?.organizations.length ?? 0)}
            detail={
              activeOrganization
                ? `${activeOrganization.name} is active now.`
                : "Switch into a gym to personalize the app."
            }
            tone="blue"
          />
          <MetricTile
            label="AI consent"
            value={session?.user.aiConsent ? "Granted" : "Pending"}
            detail={
              session?.user.aiConsent
                ? "Plan assistant and mobile AI flows are available."
                : "Grant consent to unlock personalized AI help."
            }
            tone={session?.user.aiConsent ? "lime" : "amber"}
          />
          <MetricTile
            label="Marketing"
            value={session?.user.marketingOptIn ? "Opted in" : "Quiet mode"}
            detail="Marketing preference is reflected across membership and promotional messaging."
            tone={session?.user.marketingOptIn ? "violet" : "neutral"}
          />
          <MetricTile
            label="Guardian state"
            value={session?.user.guardianPending ? "Pending" : "Clear"}
            detail={
              session?.user.isMinor
                ? session.user.guardianPending
                  ? "Guardian approval is still required."
                  : "Minor safety requirements are satisfied."
                : "Adult account"
            }
            tone={session?.user.guardianPending ? "amber" : "lime"}
          />
        </View>

        <SectionHeader
          eyebrow="Current gym"
          title="Organization context"
          subtitle="Multi-gym members and staff can switch context here without breaking the member experience."
          action={<SecondaryLink href="/find-gyms">Discover more</SecondaryLink>}
        />

        <Card style={styles.infoCard}>
          <InfoRow
            label="Active gym"
            value={activeOrganization?.name ?? "No active organization selected"}
            tone={activeOrganization ? "lime" : "neutral"}
          />
          <InfoRow
            label="Location"
            value={
              activeOrganization
                ? `${activeOrganization.city}, ${activeOrganization.state}`
                : "Switch an organization to personalize this surface"
            }
            tone="blue"
          />
          <InfoRow
            label="Status"
            value={titleCaseFromCode(activeOrganization?.status)}
            tone={activeOrganization?.status === "ACTIVE" ? "lime" : "amber"}
          />
        </Card>

        <View style={styles.orgList}>
          {session?.organizations.map((organization) => {
            const selected = organization.orgId === activeOrganization?.orgId;
            return (
              <Pressable
                key={organization.orgId}
                onPress={() => void setActiveOrgId(organization.orgId)}
                style={[styles.orgButton, selected ? styles.orgButtonActive : null]}
              >
                <View style={styles.orgButtonHeader}>
                  <View style={styles.orgButtonCopy}>
                    <Text style={styles.orgName} selectable>
                      {organization.name}
                    </Text>
                    <Text style={styles.orgMeta} selectable>
                      {organization.city}, {organization.state}
                    </Text>
                  </View>
                  <Pill tone={selected ? "lime" : "neutral"}>{selected ? "Active" : "Switch"}</Pill>
                </View>
                <View style={styles.roleRow}>
                  {organization.roles.map((role) => (
                    <Pill
                      key={`${organization.orgId}-${role}`}
                      tone={role === "MEMBER" ? "lime" : "blue"}
                    >
                      {titleCaseFromCode(role)}
                    </Pill>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader
          eyebrow="Controls"
          title="Privacy and account actions"
          subtitle="These cards keep the current privacy posture visible even before full preference management lands."
        />

        <Card style={styles.infoCard}>
          <InfoRow
            label="Marketing preferences"
            value={session?.user.marketingOptIn ? "Allowed" : "Disabled"}
            tone={session?.user.marketingOptIn ? "violet" : "neutral"}
          />
          <InfoRow
            label="AI personalization"
            value={session?.user.aiConsent ? "Allowed" : "Pending"}
            tone={session?.user.aiConsent ? "lime" : "amber"}
          />
          <InfoRow
            label="Guardian review"
            value={session?.user.guardianPending ? "Pending" : "Not required"}
            tone={session?.user.guardianPending ? "amber" : "neutral"}
          />
        </Card>

        <View style={styles.actionRow}>
          <SecondaryLink href="/notifications" style={styles.actionHalf}>
            Open inbox
          </SecondaryLink>
          <SecondaryLink href="/plans" style={styles.actionHalf}>
            Open plans
          </SecondaryLink>
        </View>

        <PrimaryButton onPress={() => void logout()} tone="danger">
          Logout
        </PrimaryButton>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  profileCard: {
    gap: 16,
  },
  profileTop: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.bg,
    fontWeight: "900",
    fontSize: 28,
  },
  profileCopy: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  profileBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  roleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoCard: {
    gap: 10,
  },
  orgList: {
    gap: 12,
  },
  orgButton: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    padding: 16,
    gap: 12,
  },
  orgButtonActive: {
    borderColor: "rgba(185,244,85,0.3)",
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  orgButtonHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  orgButtonCopy: {
    flex: 1,
    gap: 6,
  },
  orgName: {
    color: colors.text,
    fontWeight: "800",
    fontSize: 18,
  },
  orgMeta: {
    color: colors.muted,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});
