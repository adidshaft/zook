import { ReceptionDeskScreenBody } from "@/features/reception/components/desk-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function ReceptionDeskScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const params = useLocalSearchParams<{ view?: string | string[] }>();

  useEffect(() => {
    const rawView = Array.isArray(params.view) ? params.view[0] : params.view;
    if (rawView === "members") router.replace("/reception/members");
    if (rawView === "payments") router.replace("/reception/payments");
    if (rawView === "orders") router.replace("/reception/orders");
  }, [params.view, router]);

  return (
    <ReceptionWorkspace title={t("reception.home.title")} testID="reception-home-screen">
      <ReceptionDeskScreenBody />
    </ReceptionWorkspace>
  );
}
