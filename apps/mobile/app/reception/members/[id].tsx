import { useLocalSearchParams } from "expo-router";

import { ReceptionMembersScreenBody } from "@/features/reception/components/members-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionMemberDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <ReceptionWorkspace initialMemberId={id} title="Member" subtitle="Reception" showMemberContext isDetailView>
      <ReceptionMembersScreenBody />
    </ReceptionWorkspace>
  );
}
