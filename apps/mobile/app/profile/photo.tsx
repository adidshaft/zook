import { Redirect } from "expo-router";

export default function ProfilePhotoAliasRoute() {
  return <Redirect href="/profile?focus=photo" />;
}
