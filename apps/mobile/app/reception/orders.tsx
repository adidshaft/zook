import { ReceptionOrdersScreenBody } from "@/features/reception/components/orders-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { useI18n } from "@/lib/i18n";

export default function ReceptionOrdersScreen() {
  const { t } = useI18n();
  return (
    <ReceptionWorkspace title={t("reception.orders.title")}>
      <ReceptionOrdersScreenBody />
    </ReceptionWorkspace>
  );
}
