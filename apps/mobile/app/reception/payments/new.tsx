import { ReceptionPaymentsScreenBody } from "@/features/reception/components/payments-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionNewPaymentScreen() {
  return (
    <ReceptionWorkspace title="Record Payment" subtitle="Reception" showMemberContext isDetailView>
      <ReceptionPaymentsScreenBody />
    </ReceptionWorkspace>
  );
}
