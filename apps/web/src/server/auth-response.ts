import { canReturnDevOtp, getAllowedFixedOtp } from "@zook/core";

export function getDevOtpResponseValue() {
  const fixedOtp = getAllowedFixedOtp();
  if (!fixedOtp) {
    return undefined;
  }

  if (canReturnDevOtp()) {
    return fixedOtp;
  }

  return undefined;
}
