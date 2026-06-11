import { Redirect } from "expo-router";

export default function DietRedirect() {
  return <Redirect href={"/plan?tab=diet" as never} />;
}
