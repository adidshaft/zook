import { useLocalSearchParams } from "expo-router";

import { ReceptionDeskScreenBody } from "@/features/reception/components/desk-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { useI18n } from "@/lib/i18n";

export default function ReceptionVerificationScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ recordId?: string | string[] }>();
  const recordId = Array.isArray(params.recordId) ? params.recordId[0] : params.recordId;

  return (
    <ReceptionWorkspace
      initialRecordId={recordId}
      title={t("reception.verification.title")}
      isDetailView
    >
      <ReceptionDeskScreenBody />
    </ReceptionWorkspace>
  );
}
