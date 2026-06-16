const screenTitle = { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.4, lineHeight: 32 };
const headerTitle = { fontSize: 20, fontFamily: "Inter_600SemiBold", letterSpacing: -0.2, lineHeight: 26 };
const sectionTitle = { fontSize: 17, fontFamily: "Inter_600SemiBold", lineHeight: 22 };
const cardTitle = { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 20 };

export const typography = {
  // Canonical title scale for product surfaces. Prefer these four tokens for
  // new work instead of reaching for legacy synonyms below.
  screenTitle,
  headerTitle,
  sectionTitle,
  cardTitle,
  body: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 21 },
  bodyStrong: { fontSize: 15, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  caption: { fontSize: 12.5, fontFamily: "Inter_600SemiBold", lineHeight: 16 },
  small: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  metric: { fontSize: 28, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums" as const], lineHeight: 32 },
  timer: { fontSize: 44, fontFamily: "Inter_800ExtraBold", fontVariant: ["tabular-nums" as const], letterSpacing: 0, lineHeight: 50 },
  navLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", lineHeight: 15 },
  button: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  display: { fontSize: 34, fontFamily: "Inter_700Bold", letterSpacing: -0.4, lineHeight: 39 },
  // Legacy aliases collapsed onto the canonical scale above. Kept for
  // compatibility while callsites are gradually codemodded.
  h1: screenTitle,
  h2: headerTitle,
  h3: cardTitle,
  headline: screenTitle,
  title: headerTitle,
  titleSmall: cardTitle,
  eyebrow: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0,
    textTransform: "uppercase" as const,
  },
};
