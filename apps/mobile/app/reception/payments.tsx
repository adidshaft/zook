import { useLocalSearchParams } from "expo-router";

import { ReceptionPaymentsScreenBody } from "@/features/reception/components/payments-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionPaymentsScreen() {
  const params = useLocalSearchParams<{ memberId?: string | string[] }>();
  const memberId = Array.isArray(params.memberId) ? params.memberId[0] : params.memberId;

  return (
    <ReceptionWorkspace
      initialMemberId={memberId}
      title={memberId ? "New Payment" : "Record Payment"}
      subtitle={memberId ? "Reception member payment" : "Reception"}
      showMemberContext
      isDetailView={Boolean(memberId)}
    >
      <ReceptionPaymentsScreenBody />
    </ReceptionWorkspace>
  );
}
