import {
  Bell,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Dumbbell,
  QrCode,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { publicT, type PublicLocale } from "@/lib/public-i18n";

type HomeTone = "neutral" | "info";

export function homeData(locale: PublicLocale) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return {
    t,
    statStrip: [t("rolesLabel"), t("recordLabel"), t("uptimeLabel")] as const,
    pillars: [
      { icon: Users, label: t("owners"), value: t("ownersValue"), tone: "neutral" },
      { icon: Smartphone, label: t("members"), value: t("membersValue"), tone: "info" },
      { icon: Bell, label: t("staff"), value: t("staffValue"), tone: "neutral" },
    ] satisfies Array<{ icon: LucideIcon; label: string; value: string; tone: HomeTone }>,
    ownerFeatures: [
      [ClipboardList, t("membershipManagement")],
      [ShieldCheck, t("staffTrainerTools")],
      [ReceiptText, t("paymentInvoicing")],
      [Users, t("referralPrograms")],
      [ShoppingBag, t("shopInventory")],
      [ChartNoAxesColumnIncreasing, t("analyticsReports")],
    ] satisfies Array<[LucideIcon, string]>,
    memberFeatures: [
      [QrCode, t("qrCheckIn")],
      [Dumbbell, t("workoutPlans")],
      [Smartphone, t("fitnessAssistant")],
      [ChartNoAxesColumnIncreasing, t("progressTracking")],
      [Store, t("shopPickup")],
      [Bell, t("notifications")],
    ] satisfies Array<[LucideIcon, string]>,
    proofPoints: [t("proofOwnerWeb"), t("proofMemberMobile"), t("proofSharedRecord")],
    operationsLoop: [
      { icon: Users, label: t("loopJoin"), copy: t("loopJoinCopy"), tone: "neutral" },
      { icon: QrCode, label: t("loopCheckIn"), copy: t("loopCheckInCopy"), tone: "info" },
      { icon: Dumbbell, label: t("loopCoach"), copy: t("loopCoachCopy"), tone: "neutral" },
      {
        icon: ChartNoAxesColumnIncreasing,
        label: t("loopGrow"),
        copy: t("loopGrowCopy"),
        tone: "info",
      },
    ] satisfies Array<{ icon: LucideIcon; label: string; copy: string; tone: HomeTone }>,
  };
}
