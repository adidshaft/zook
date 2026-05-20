import { useLocalSearchParams } from "expo-router";

import { ReceptionSurface } from "@/features/reception/reception-surface";

export default function ReceptionMemberDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return <ReceptionSurface initialMemberId={id} view="members" />;
}
