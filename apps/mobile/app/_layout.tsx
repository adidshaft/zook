import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#070908" },
          headerTintColor: "#f4f7ef",
          contentStyle: { backgroundColor: "#070908" }
        }}
      />
    </>
  );
}
