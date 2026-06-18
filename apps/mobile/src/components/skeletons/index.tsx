import { StyleSheet, View } from "react-native";
import { Card, Skeleton } from "@/components/primitives";
import { spacing, useTheme } from "@/lib/theme";

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
    <Card variant="compact" padding={14} contentStyle={styles.row}>
      {content}
    </Card>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

function PlanCardSkeleton() {
  return (
    <Card variant="compact" contentStyle={styles.planCard}>
      <Skeleton width="48%" height={18} borderRadius={9} />
      <View style={styles.copy}>
        <Skeleton width="92%" height={13} borderRadius={7} />
        <Skeleton width="72%" height={13} borderRadius={7} />
      </View>
      <Skeleton width="100%" height={34} borderRadius={17} />
    </Card>
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
        <Card key={item} variant="compact">
          <RowSkeleton iconSize={34} action="chip" surface={false} />
        </Card>
      ))}
    </View>
  );
}

export function MembershipSkeleton() {
  return (
    <View style={styles.stack}>
      <Card variant="selected" contentStyle={styles.membershipCard}>
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
      </Card>
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
  const { palette } = useTheme();
  return (
    <View style={styles.stack}>
      <View style={styles.metricGrid}>
        {[0, 1, 2, 3].map((item) => (
          <Card
            key={item}
            variant="compact"
            style={styles.metricHalf}
            contentStyle={styles.metricTile}
          >
            <Skeleton width="44%" height={12} borderRadius={6} />
            <Skeleton width="62%" height={28} borderRadius={14} />
            <Skeleton width="70%" height={12} borderRadius={6} />
          </Card>
        ))}
      </View>
      {[0, 1].map((item) => (
        <Card key={item} variant="compact" contentStyle={styles.listCard}>
          <RowSkeleton iconSize={34} action="chip" surface={false} />
          <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} />
          <RowSkeleton iconSize={34} action="chip" surface={false} />
        </Card>
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

export function FindGymsSkeleton() {
  return (
    <View style={styles.stack}>
      <Card variant="compact" contentStyle={styles.searchBar}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width="72%" height={16} borderRadius={8} />
      </Card>
      {[0, 1, 2, 3, 4].map((item) => (
        <Card key={item} contentStyle={styles.gymCard}>
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
        </Card>
      ))}
    </View>
  );
}

export function GymDetailSkeleton() {
  const { palette } = useTheme();
  return (
    <View style={styles.stack}>
      <Card contentStyle={styles.gymHeroSkeleton}>
        <Skeleton width="100%" height={192} borderRadius={20} />
        <View style={styles.row}>
          <Skeleton width={58} height={58} borderRadius={18} />
          <CardCopySkeleton titleWidth="58%" lineWidth="70%" />
          <Skeleton width={84} height={28} borderRadius={14} />
        </View>
      </Card>
      <Card variant="compact" contentStyle={styles.listCard}>
        <RowSkeleton iconSize={34} action="chip" surface={false} />
        <View style={[styles.divider, { backgroundColor: palette.border.subtle }]} />
        <RowSkeleton iconSize={34} action="chip" surface={false} />
      </Card>
      {[0, 1].map((item) => (
        <PlanCardSkeleton key={item} />
      ))}
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.stack}>
      {/* Banner Skeleton */}
      <Card variant="compact" contentStyle={styles.row}>
        <Skeleton width={34} height={34} borderRadius={17} />
        <View style={styles.copy}>
          <Skeleton width="60%" height={14} borderRadius={7} />
          <Skeleton width="80%" height={11} borderRadius={5} />
        </View>
        <Skeleton width={58} height={28} borderRadius={14} />
      </Card>

      {/* Main Home Card Skeleton */}
      <Card variant="selected" contentStyle={styles.membershipCard}>
        <View style={styles.row}>
          <Skeleton width={46} height={46} borderRadius={23} />
          <View style={styles.copy}>
            <Skeleton width="68%" height={20} borderRadius={10} />
            <Skeleton width="88%" height={14} borderRadius={7} />
            <Skeleton width="48%" height={14} borderRadius={7} />
          </View>
        </View>
        <Skeleton width="100%" height={48} borderRadius={24} />
      </Card>
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
  },
});
