export type Palette = {
  bg: {
    app: string;
    elevated: string;
    sunken: string;
    overlay: string;
  };
  surface: {
    default: string;
    raised: string;
    accentSoft: string;
    dangerSoft: string;
    warningSoft: string;
    successSoft: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    onAccent: string;
    onDanger: string;
    onWarning: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
    focus: string;
  };
  accent: {
    base: string;
    soft: string;
    strong: string;
    fill: string;
  };
  feedback: {
    danger: string;
    warning: string;
    success: string;
    info: string;
  };
  shadow: {
    sm: string;
    md: string;
    lg: string;
  };
};
