export function assertMinorConsentGranted(input: {
  isMinor: boolean;
  guardianPending: boolean;
  action: string;
}) {
  if (input.isMinor && input.guardianPending) {
    throw new Error(`Guardian consent required before ${input.action}.`);
  }
}
