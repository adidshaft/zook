import { ImageResponse } from "next/og";
import { getPublicGymProfileData } from "@/server/public-gym-read-models";

export const runtime = "nodejs";
export const revalidate = 600;
export const alt = "Zook gym profile";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

type GymOpenGraphImageProps = { params: Promise<{ username: string }> };

function priceLine(plans: Array<{ pricePaise: number }>) {
  if (!plans.length) {
    return "Membership plans on Zook";
  }
  const minPrice = Math.min(...plans.map((plan) => plan.pricePaise));
  return `Starting at INR ${Math.round(minPrice / 100).toLocaleString("en-IN")}/month`;
}

export default async function GymOpenGraphImage({ params }: GymOpenGraphImageProps) {
  const { username } = await params;
  const data = await getPublicGymProfileData(username).catch(() => null);
  const gymName = data?.org.name ?? "Zook gym profile";
  const location = data?.org.city ? `${data.org.city}, ${data.org.state}` : "India-first gym OS";
  const planSummary = data ? priceLine(data.plans) : "Memberships, QR entry, and gym workflows";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "linear-gradient(135deg, #b9f455 0%, #10170d 46%, #070908 100%)",
          color: "#f4f7ef",
          display: "flex",
          height: "100%",
          justifyContent: "space-between",
          padding: 64,
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            maxWidth: 760,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div
              style={{
                alignItems: "center",
                background: "rgba(7, 9, 8, 0.72)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: 999,
                display: "flex",
                fontSize: 30,
                fontWeight: 700,
                gap: 16,
                padding: "14px 24px",
                width: "fit-content",
              }}
            >
              <span
                style={{
                  background: "#b9f455",
                  borderRadius: 18,
                  color: "#070908",
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 900,
                  height: 48,
                  justifyContent: "center",
                  lineHeight: "48px",
                  width: 48,
                }}
              >
                Z
              </span>
              Zook
            </div>
            <h1
              style={{
                fontSize: gymName.length > 24 ? 70 : 86,
                letterSpacing: "-0.03em",
                lineHeight: 0.94,
                margin: 0,
                maxWidth: 760,
              }}
            >
              {gymName}
            </h1>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ color: "rgba(244, 247, 239, 0.72)", fontSize: 34 }}>{location}</div>
            <div
              style={{
                background: "rgba(7, 9, 8, 0.58)",
                border: "1px solid rgba(255, 255, 255, 0.16)",
                borderRadius: 32,
                fontSize: 38,
                fontWeight: 700,
                padding: "18px 24px",
                width: "fit-content",
              }}
            >
              {planSummary}
            </div>
          </div>
        </div>
        <div
          style={{
            alignItems: "center",
            alignSelf: "flex-end",
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
            borderRadius: 40,
            display: "flex",
            flexDirection: "column",
            gap: 18,
            height: 250,
            justifyContent: "center",
            padding: 28,
            width: 250,
          }}
        >
          <div style={{ color: "rgba(244, 247, 239, 0.58)", fontSize: 28 }}>Profile</div>
          <div style={{ color: "#b9f455", fontSize: 52, fontWeight: 800 }}>/g/{username}</div>
        </div>
      </div>
    ),
    size,
  );
}
