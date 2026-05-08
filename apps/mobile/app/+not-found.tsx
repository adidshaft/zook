import { useRouter } from "expo-router";
import { Text } from "react-native";

import { EmptyState, ZookButton, ZookScreen } from "@/components/primitives";
import { routeForRole } from "@/lib/route-guards";
import { useAuth } from "@/lib/auth";

export default function NotFoundScreen() {
  const router = useRouter();
  const { activeRole, session } = useAuth();
  const homeRoute =
    session?.user.isPlatformAdmin && !activeRole ? "/platform" : routeForRole(activeRole ?? "MEMBER");

  return (
    <ZookScreen style={{ justifyContent: "center", paddingHorizontal: 20 }}>
      <EmptyState
        icon="compass-outline"
        title="This screen is not available"
        body="The link may be old, or this role may not have access to that workflow."
        action={
          <>
            <ZookButton onPress={() => router.replace(homeRoute as never)} fullWidth>
              Go to my workspace
            </ZookButton>
            <Text style={{ color: "rgba(244,247,239,0.52)", textAlign: "center", marginTop: 8 }}>
              Zook will keep this route from showing a blank or unmatched screen.
            </Text>
          </>
        }
      />
    </ZookScreen>
  );
}
