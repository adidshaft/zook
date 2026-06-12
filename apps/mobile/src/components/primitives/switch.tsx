import { Platform, Switch, type SwitchProps } from "react-native";

import { useTheme } from "@/lib/theme";

export function ThemedSwitch(props: SwitchProps) {
  const { mode, palette } = useTheme();
  const isDark = mode === "dark";
  const enabledTrack = isDark ? palette.surface.accentSoft : palette.accent.base;
  const disabledTrack = isDark ? palette.border.strong : palette.border.default;
  const thumbOff = isDark ? palette.text.secondary : palette.bg.elevated;

  return (
    <Switch
      {...props}
      ios_backgroundColor={disabledTrack}
      trackColor={{
        false: disabledTrack,
        true: enabledTrack,
      }}
      thumbColor={Platform.OS === "ios" ? undefined : props.value ? palette.text.onAccent : thumbOff}
    />
  );
}
