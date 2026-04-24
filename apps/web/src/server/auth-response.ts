export function getDevOtpResponseValue() {
  const fixedOtp = process.env.OTP_FIXED_CODE_DEV?.trim();
  if (!fixedOtp) {
    return undefined;
  }

  if (process.env.NODE_ENV === "test") {
    return fixedOtp;
  }

  if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP_RESPONSE === "true") {
    return fixedOtp;
  }

  return undefined;
}
