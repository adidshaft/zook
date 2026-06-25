import { useLocalSearchParams } from "expo-router";

import { ReceptionPaymentsScreenBody } from "@/features/reception/components/payments-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { useI18n } from "@/lib/i18n";

export default function ReceptionPaymentsScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ memberId?: string | string[] }>();
  const memberId = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;

  return (
    <ReceptionWorkspace
      initialMemberId={memberId}
      title={memberId ? t("reception.payments.newPayment") : t("reception.payments.recordPayment")}
      subtitle={memberId ? t("reception.payments.memberPayment") : t("reception.payments.subtitle")}
      showMemberContext
      isDetailView={Boolean(memberId)}
    >
      <ReceptionPaymentsScreenBody />
    </ReceptionWorkspace>
  );
}
