import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./objects.css";
import { AmbientAudio } from "@/components/layout/AmbientAudio";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Providers } from "@/components/layout/Providers";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://setapak.budayago.id";

export const viewport: Viewport = {
  themeColor: "#0d0b09",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SETAPAK | Menelusuri 1,65 Juta Tahun Cagar Budaya Indonesia",
    template: "%s | SETAPAK",
  },
  description:
    "Satu guliran panjang menembus 1,65 juta tahun cagar budaya Nusantara: penghitung tahun berjalan mengikuti guliran, dan setiap peristiwa muncul tepat di tahunnya. Karya Inovasi Digital BUDAYA GO! 2026.",
  keywords: [
    "SETAPAK",
    "Cagar Budaya Indonesia",
    "BUDAYA GO 2026",
    "Scrollytelling Sejarah",
    "Sangiran",
    "Karst Maros Pangkep",
    "Borobudur",
    "Prambanan",
    "Somba Opu",
    "Muarajambi",
  ],
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: siteUrl,
    siteName: "SETAPAK",
    title: "SETAPAK | Situs Edukasi Tentang Aneka Peninggalan Kebudayaan",
    description:
      "Menelusuri 1,65 juta tahun peradaban Nusantara, satu guliran demi satu guliran.",
  },
  twitter: {
    card: "summary_large_image",
    title: "SETAPAK | Linimasa Interaktif Cagar Budaya Indonesia",
    description:
      "Menelusuri 1,65 juta tahun peradaban Nusantara, satu guliran demi satu guliran.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SETAPAK (Situs Edukasi Tentang Aneka Peninggalan Kebudayaan)",
    url: siteUrl,
    description:
      "Guliran waktu interaktif cagar budaya Indonesia dari 1,65 juta tahun lalu hingga 2026.",
    inLanguage: ["id-ID", "en-US"],
    author: {
      "@type": "Organization",
      name: "Tim Institut Teknologi Bontomarannu (Universitas Hasanuddin)",
    },
  };

  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <body className="bg-ink-950 text-sand-100 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>
          <Header />
          <main id="main-content" className="min-h-screen">
            {children}
          </main>
          <AmbientAudio />
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
