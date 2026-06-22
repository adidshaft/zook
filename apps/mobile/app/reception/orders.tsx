import { ReceptionOrdersScreenBody } from "@/features/reception/components/orders-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionOrdersScreen() {
  return (
    <ReceptionWorkspace title="Orders">
      <ReceptionOrdersScreenBody />
    </ReceptionWorkspace>
  );
}
