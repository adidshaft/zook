import { Redirect, useLocalSearchParams } from "expo-router";

export default function AiDraftRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/trainer/clients/${id}/plan?focus=ai` as never} />;
}
