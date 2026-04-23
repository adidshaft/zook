import { Link } from "expo-router";
import type { Href } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "@/lib/theme";

export function Screen({
  children,
  title
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <View style={styles.screen}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "lime" | "amber" | "red" }) {
  const palette = {
    neutral: { borderColor: colors.border, color: colors.muted, backgroundColor: "rgba(255,255,255,0.06)" },
    lime: { borderColor: "rgba(185,244,85,0.35)", color: colors.lime, backgroundColor: "rgba(185,244,85,0.12)" },
    amber: { borderColor: "rgba(255,182,80,0.35)", color: colors.amber, backgroundColor: "rgba(255,182,80,0.12)" },
    red: { borderColor: "rgba(255,93,93,0.35)", color: colors.red, backgroundColor: "rgba(255,93,93,0.12)" }
  }[tone];
  return (
    <View style={[styles.pill, palette]}>
      <Text style={[styles.pillText, { color: palette.color }]} selectable>
        {children}
      </Text>
    </View>
  );
}

export function PrimaryButton({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>{children}</Text>
    </Pressable>
  );
}

export function Dock() {
  const items: Array<[Href, string]> = [
    ["/", "Home"],
    ["/plans", "Plans"],
    ["/scan", "Scan"],
    ["/shop", "Shop"],
    ["/profile", "Profile"]
  ];
  return (
    <View style={styles.dock}>
      {items.map(([href, label]) => (
        <Link key={String(href)} href={href} asChild>
          <Pressable style={styles.dockItem}>
            <Text style={styles.dockText}>{label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingTop: 16
  },
  card: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 18
  },
  pill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700"
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  primaryButtonText: {
    color: "#070908",
    fontWeight: "800",
    fontSize: 16
  },
  dock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    minHeight: 64,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(10,12,10,0.92)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 8
  },
  dockItem: {
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  dockText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  }
});
