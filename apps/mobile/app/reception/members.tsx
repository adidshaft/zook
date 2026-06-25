import { ReceptionMembersScreenBody } from "@/features/reception/components/members-screen";
import { ReceptionWorkspace } from "@/features/reception/reception-workspace";
import { useI18n } from "@/lib/i18n";

export default function ReceptionMembersScreen() {
  const { t } = useI18n();
  return (
    <ReceptionWorkspace title={t("reception.members.title")} showMemberContext noScroll>
      <ReceptionMembersScreenBody />
    </ReceptionWorkspace>
  );
}
