import { ReceptionDeskScreenBody } from "@/features/reception/components/desk-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionVerificationScreen() {
  return (
    <ReceptionWorkspace title="Verification" subtitle="Reception" isDetailView>
      <ReceptionDeskScreenBody />
    </ReceptionWorkspace>
  );
}
