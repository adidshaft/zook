import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Deep-link target for the gym check-in QR / short link.
 *
 * The reception QR encodes a universal link on an associated domain
 * (e.g. https://zookfit.in/checkin?c=AB-1234&p=<signed-payload>). When the
 * member's native camera opens it, iOS/Android hand it to the app and land
 * here. We normalise the params and forward them into the member scanner,
 * which auto-submits the check-in.
 */
export default function CheckInDeepLink() {
  const params = useLocalSearchParams<{
    p?: string;
    payload?: string;
    qrPayload?: string;
    c?: string;
    code?: string;
    checkInCode?: string;
  }>();

  const qrPayload = params.qrPayload ?? params.payload ?? params.p ?? "";
  const checkInCode = params.checkInCode ?? params.code ?? params.c ?? "";

  const forward: Record<string, string> = {};
  if (qrPayload) forward.autoQrPayload = String(qrPayload);
  else if (checkInCode) forward.autoCheckInCode = String(checkInCode);

  return <Redirect href={{ pathname: "/scan", params: forward } as never} />;
}
