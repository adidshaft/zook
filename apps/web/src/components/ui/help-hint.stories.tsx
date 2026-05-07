import { HelpHint } from "./help-hint";

export default { title: "UI/HelpHint", component: HelpHint };

export function Basic() {
  return (
    <HelpHint label="Payment mode" title="Payment mode">
      UPI is a direct bank transfer. Cash and Card are recorded for reconciliation.
    </HelpHint>
  );
}
