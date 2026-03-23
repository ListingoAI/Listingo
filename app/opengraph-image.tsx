import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Listingo — AI opisy produktów w 30 sekund"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #030712 0%, #0a1628 50%, #030712 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(16, 185, 129, 0.15), transparent 70%)",
            borderRadius: "50%",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 64 }}>⚡</span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 800,
              background: "linear-gradient(90deg, #10B981, #34D399)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Listingo
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 32,
            color: "rgba(255, 255, 255, 0.7)",
            marginTop: 8,
          }}
        >
          Opisy produktów w 30 sekund
        </p>

        {/* Tags */}
        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          {["AI", "Allegro", "SEO", "E-commerce"].map((tag) => (
            <span
              key={tag}
              style={{
                padding: "8px 20px",
                borderRadius: 100,
                border: "1px solid rgba(16, 185, 129, 0.3)",
                background: "rgba(16, 185, 129, 0.1)",
                color: "#10B981",
                fontSize: 18,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* URL */}
        <p
          style={{
            position: "absolute",
            bottom: 32,
            fontSize: 18,
            color: "rgba(255, 255, 255, 0.3)",
          }}
        >
          listingo.pl
        </p>
      </div>
    ),
    { ...size }
  )
}
