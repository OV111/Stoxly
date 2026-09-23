import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#050505",
          backgroundImage:
            "radial-gradient(circle at 50% 40%, rgba(59,130,246,0.35), transparent 60%)",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.02em",
          }}
        >
          Stoxly
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            color: "#9ca3af",
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          Portfolio intelligence, not just a ticker dashboard
        </div>
      </div>
    ),
    { ...size },
  );
}
