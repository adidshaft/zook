import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@zook/db";

function absoluteUrl(request: NextRequest, path: string) {
  return new URL(path, request.nextUrl.origin).toString();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const org = await prisma.organization.findUnique({ where: { username } });
  if (!org || org.visibility === "HIDDEN") {
    return new NextResponse("Gym not found", { status: 404 });
  }

  const target = request.nextUrl.searchParams.get("target");
  const data =
    target === "app"
      ? `zook://join/${org.username}`
      : absoluteUrl(request, `/in/${org.username}?source=qr`);
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
    headers.set("content-disposition", `attachment; filename="${org.username}-zook-join-qr.svg"`);
  }
  return new NextResponse(svg, { headers });
}
