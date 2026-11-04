import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "HabitForge — Build Better Habits";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0B1020 0%, #1E1B4B 60%, #312E81 100%)",
          color: "#F8FAFC",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#6366F1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            ✓
          </div>
          <span style={{ fontSize: 34, fontWeight: 600 }}>HabitForge</span>
        </div>
        <div style={{ marginTop: 48, fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>
          Build Better Habits.
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, color: "#A5B4FC", lineHeight: 1.1 }}>
          Become Your Best Self.
        </div>
        <div style={{ marginTop: 32, fontSize: 28, color: "#CBD5E1", maxWidth: 900 }}>
          Real tracking, streaks, analytics and recovery when you miss a day.
        </div>
      </div>
    ),
    size
  );
}
