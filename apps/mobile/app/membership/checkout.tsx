import { Redirect } from "expo-router";

export default function MembershipCheckoutAliasRoute() {
  return <Redirect href="/membership?focus=checkout" />;
}
