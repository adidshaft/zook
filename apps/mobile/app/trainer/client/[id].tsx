import { Redirect, useLocalSearchParams } from "expo-router";

export default function ClientDetailRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/trainer/clients/${id}` as never} />;
}
