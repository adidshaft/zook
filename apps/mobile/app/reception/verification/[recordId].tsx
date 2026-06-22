import { useLocalSearchParams } from "expo-router";

import { ReceptionDeskScreenBody } from "@/features/reception/components/desk-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionVerificationScreen() {
  const params = useLocalSearchParams<{ recordId?: string | string[] }>();
  const recordId = Array.isArray(params.recordId) ? params.recordId[0] : params.recordId;

  return (
    <ReceptionWorkspace
      initialRecordId={recordId}
      title="Verification"
      isDetailView
    >
      <ReceptionDeskScreenBody />
    </ReceptionWorkspace>
  );
}
