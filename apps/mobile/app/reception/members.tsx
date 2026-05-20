import { ReceptionMembersScreenBody } from "@/features/reception/components/members-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";

export default function ReceptionMembersScreen() {
  return (
    <ReceptionWorkspace title="Members" subtitle="Reception" showMemberContext>
      <ReceptionMembersScreenBody />
    </ReceptionWorkspace>
  );
}
