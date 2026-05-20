import { StyleSheet, View } from "react-native";
import { GlassCard, Skeleton } from "@/components/primitives";
import { legacyColors, spacing } from "@/lib/theme";

function CardCopySkeleton({
  titleWidth = "62%",
  lineWidth = "86%",
}: {
  titleWidth?: number | string;
  lineWidth?: number | string;
}) {
  return (
    <View style={styles.copy}>
      <Skeleton width={titleWidth} height={16} borderRadius={8} />
      <Skeleton width={lineWidth} height={12} borderRadius={6} />
    </View>
  );
}

function RowSkeleton({
  action,
  iconSize = 38,
  surface = true,
}: {
  action?: "button" | "chip";
  iconSize?: number;
  surface?: boolean;
}) {
  const content = (
    <>
      <Skeleton width={iconSize} height={iconSize} borderRadius={iconSize / 2} />
      <CardCopySkeleton />
      {action === "button" ? <Skeleton width={72} height={32} borderRadius={16} /> : null}
      {action === "chip" ? <Skeleton width={58} height={24} borderRadius={12} /> : null}
    </>
  );

  return surface ? (
    <GlassCard variant="compact" padding={14} contentStyle={styles.row}>
      {content}
    </GlassCard>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

function PlanCardSkeleton() {
  return (
    <GlassCard variant="compact" contentStyle={styles.planCard}>
      <Skeleton width="48%" height={18} borderRadius={9} />
      <View style={styles.copy}>
        <Skeleton width="92%" height={13} borderRadius={7} />
        <Skeleton width="72%" height={13} borderRadius={7} />
      </View>
      <Skeleton width="100%" height={34} borderRadius={17} />
    </GlassCard>
  );
}

export function PlansSkeleton() {
  return (
    <View style={styles.stack}>
      {[0, 1, 2].map((item) => (
        <PlanCardSkeleton key={item} />
      ))}
    </View>
  );
}

export function ExerciseListSkeleton() {
  return (
    <View style={styles.stack}>
      {[0, 1, 2, 3, 4].map((item) => (
        <GlassCard key={item} variant="compact">
          <RowSkeleton iconSize={34} action="chip" surface={false} />
        </GlassCard>
      ))}
    </View>
  );
}

export function MembershipSkeleton() {
  return (
    <View style={styles.stack}>
      <GlassCard variant="selected" contentStyle={styles.membershipCard}>
        <View style={styles.row}>
          <Skeleton width={42} height={42} borderRadius={21} />
          <CardCopySkeleton titleWidth="58%" lineWidth="76%" />
          <Skeleton width={64} height={26} borderRadius={13} />
        </View>
        <View style={styles.copy}>
          <Skeleton width="70%" height={28} borderRadius={14} />
          <Skeleton width="42%" height={14} borderRadius={7} />
        </View>
        <Skeleton width="100%" height={10} borderRadius={5} />
        <View style={styles.footerRow}>
          <Skeleton width="38%" height={14} borderRadius={7} />
          <Skeleton width={118} height={36} borderRadius={18} />
        </View>
      </GlassCard>
    </View>
  );
}

export function NotificationsSkeleton() {
  return (
    <View style={styles.stack}>
      {[0, 1, 2, 3, 4].map((item) => (
        <RowSkeleton key={item} iconSize={40} />
      ))}
    </View>
  );
}

export function OwnerDashboardSkeleton() {
  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        {[0, 1, 2, 3].map((item) => (
          <GlassCard
            key={item}
            variant="compact"
            style={styles.metricHalf}
            contentStyle={styles.metricTile}
          >
            <Skeleton width="44%" height={12} borderRadius={6} />
            <Skeleton width="62%" height={28} borderRadius={14} />
            <Skeleton width="70%" height={12} borderRadius={6} />
          </GlassCard>
        ))}
      </View>
      {[0, 1].map((item) => (
        <GlassCard key={item} variant="compact" contentStyle={styles.listCard}>
          <RowSkeleton iconSize={34} action="chip" surface={false} />
          <View style={styles.divider} />
          <RowSkeleton iconSize={34} action="chip" surface={false} />
        </GlassCard>
      ))}
    </View>
  );
}

export function ReceptionQueueSkeleton() {
  return (
    <View style={styles.stack}>
      {[0, 1, 2, 3, 4].map((item) => (
        <RowSkeleton key={item} action="button" />
      ))}
    </View>
  );
}

export function TrainerClientsSkeleton() {
  return (
    <View style={styles.stack}>
      {[0, 1, 2, 3, 4].map((item) => (
        <RowSkeleton key={item} action="chip" />
      ))}
    </View>
  );
}

export function TrackingHistorySkeleton() {
  return (
    <View style={styles.stack}>
      <GlassCard variant="compact" contentStyle={styles.chartCard}>
        <Skeleton width="42%" height={16} borderRadius={8} />
        <Skeleton width="100%" height={156} borderRadius={18} />
      </GlassCard>
      {[0, 1, 2, 3, 4].map((item) => (
        <RowSkeleton key={item} iconSize={34} action="chip" />
      ))}
    </View>
  );
}

export function FindGymsSkeleton() {
  return (
    <View style={styles.stack}>
      <GlassCard variant="compact" contentStyle={styles.searchBar}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width="72%" height={16} borderRadius={8} />
      </GlassCard>
      {[0, 1, 2, 3, 4].map((item) => (
        <GlassCard key={item} contentStyle={styles.gymCard}>
          <View style={styles.row}>
            <Skeleton width={58} height={58} borderRadius={16} />
            <CardCopySkeleton titleWidth="64%" lineWidth="46%" />
            <Skeleton width={72} height={26} borderRadius={13} />
          </View>
          <View style={styles.tagRow}>
            <Skeleton width={58} height={22} borderRadius={11} />
            <Skeleton width={72} height={22} borderRadius={11} />
            <Skeleton width={52} height={22} borderRadius={11} />
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

export function GymDetailSkeleton() {
  return (
    <View style={styles.stack}>
      <GlassCard contentStyle={styles.gymHeroSkeleton}>
        <Skeleton width="100%" height={192} borderRadius={20} />
        <View style={styles.row}>
          <Skeleton width={58} height={58} borderRadius={18} />
          <CardCopySkeleton titleWidth="58%" lineWidth="70%" />
          <Skeleton width={84} height={28} borderRadius={14} />
        </View>
      </GlassCard>
      <GlassCard variant="compact" contentStyle={styles.listCard}>
        <RowSkeleton iconSize={34} action="chip" surface={false} />
        <View style={styles.divider} />
        <RowSkeleton iconSize={34} action="chip" surface={false} />
      </GlassCard>
      {[0, 1].map((item) => (
        <PlanCardSkeleton key={item} />
      ))}
    </View>
  );
}

export function SettingsSkeleton() {
  return (
    <View style={styles.stack}>
      {[0, 1, 2].map((item) => (
        <GlassCard key={item} variant="compact" contentStyle={styles.listCard}>
          <RowSkeleton iconSize={34} action="chip" surface={false} />
          <View style={styles.divider} />
          <RowSkeleton iconSize={34} action="chip" surface={false} />
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  planCard: {
    gap: spacing.md,
  },
  membershipCard: {
    gap: spacing.lg,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricTile: {
    minHeight: 116,
    justifyContent: "center",
    gap: 10,
  },
  metricHalf: {
    width: "48%",
  },
  listCard: {
    gap: 10,
  },
  chartCard: {
    gap: spacing.md,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  gymCard: {
    gap: spacing.md,
  },
  gymHeroSkeleton: {
    gap: spacing.lg,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: legacyColors.border,
  },
});
