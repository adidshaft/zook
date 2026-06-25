import { useLocalSearchParams } from "expo-router";

import { ReceptionMembersScreenBody } from "@/features/reception/components/members-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { useI18n } from "@/lib/i18n";

export default function ReceptionMemberDetailScreen() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <ReceptionWorkspace initialMemberId={id} title={t("reception.members.memberTitle")} showMemberContext isDetailView>
      <ReceptionMembersScreenBody />
    </ReceptionWorkspace>
  );
}
