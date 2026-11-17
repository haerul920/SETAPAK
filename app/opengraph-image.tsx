import { ImageResponse } from "next/og";

export const alt = "SETAPAK - Linimasa Cagar Budaya Indonesia";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          background: "linear-gradient(135deg, #0d0b09 0%, #1a140e 55%, #2b2015 100%)",
          color: "#f5ecdc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "10px 22px",
              borderRadius: "999px",
              border: "1px solid #e7b75f",
              color: "#e7b75f",
              fontSize: "20px",
              letterSpacing: "3px",
              fontWeight: 700,
            }}
          >
            BUDAYA GO! 2026 • INOVASI DIGITAL
          </div>
          <div
            style={{
              color: "#d9c7a7",
              fontSize: "22px",
              fontWeight: 600,
            }}
          >
            1,65 JUTA TAHUN → 2026
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div
            style={{
              fontSize: "108px",
              fontWeight: 900,
              letterSpacing: "-2px",
              color: "#f5ecdc",
              lineHeight: 1,
            }}
          >
            SETAPAK
          </div>
          <div
            style={{
              fontSize: "34px",
              color: "#e7b75f",
              fontWeight: 600,
              maxWidth: "960px",
            }}
          >
            Situs Edukasi Tentang Aneka Peninggalan Kebudayaan
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#d9c7a7",
              maxWidth: "880px",
              lineHeight: 1.4,
            }}
          >
            Menelusuri 1,65 juta tahun peradaban Nusantara, satu guliran demi satu guliran.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid rgba(231, 183, 95, 0.3)",
            paddingTop: "24px",
            fontSize: "20px",
            color: "#a8916c",
          }}
        >
          <span>8 Babak Sejarah • 13 Situs Cagar Budaya • 64 Sumber Terkurasi</span>
          <span style={{ color: "#e7b75f" }}>Institut Teknologi Bontomarannu • Unhas</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
