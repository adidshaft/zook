import { ReceptionDeskScreenBody } from "@/features/reception/components/desk-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionDeskScreen() {
  return (
    <ReceptionWorkspace title="Desk" subtitle="Receptionist Desk" testID="reception-desk-screen">
      <ReceptionDeskScreenBody />
    </ReceptionWorkspace>
  );
}
