import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { getPublicGymProfileData } from "../../../src/server/public-gym-read-models";
import { buildPublicQrData } from "../../../src/server/public-qr";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await getPublicGymProfileData(username);
  if (!profile) {
    return new NextResponse("Gym not found", { status: 404 });
  }

  const target = request.nextUrl.searchParams.get("target");
  const data = buildPublicQrData(request.nextUrl.origin, profile.org.username, target);
  const svg = await QRCode.toString(data, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
    color: {
      dark: "#070908",
      light: "#ffffff",
    },
  });
  const headers = new Headers({
    "content-type": "image/svg+xml; charset=utf-8",
    "cache-control": "no-store",
  });
  if (request.nextUrl.searchParams.get("download") === "1") {
    headers.set(
      "content-disposition",
      `attachment; filename="${profile.org.username}-zook-join-qr.svg"`,
    );
  }
  return new NextResponse(svg, { headers });
}
