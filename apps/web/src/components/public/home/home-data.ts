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

export function homeData(locale: PublicLocale) {
  const t = (key: Parameters<typeof publicT>[1]) => publicT(locale, key);
  return {
    t,
    pillars: [
      { icon: Users, label: t("owners"), value: t("ownersValue"), tone: "lime" },
      { icon: Smartphone, label: t("members"), value: t("membersValue"), tone: "amber" },
      { icon: Bell, label: t("staff"), value: t("staffValue"), tone: "sky" },
    ] satisfies Array<{ icon: LucideIcon; label: string; value: string; tone: string }>,
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
      { icon: Users, label: t("loopJoin"), copy: t("loopJoinCopy"), tone: "lime" },
      { icon: QrCode, label: t("loopCheckIn"), copy: t("loopCheckInCopy"), tone: "amber" },
      { icon: Dumbbell, label: t("loopCoach"), copy: t("loopCoachCopy"), tone: "sky" },
      {
        icon: ChartNoAxesColumnIncreasing,
        label: t("loopGrow"),
        copy: t("loopGrowCopy"),
        tone: "lime",
      },
    ] satisfies Array<{ icon: LucideIcon; label: string; copy: string; tone: string }>,
  };
}
