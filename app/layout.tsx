import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./garden.css";
import "./effects.css";

export const metadata: Metadata = {
  title: { default: "Cuốn Sổ tình iu", template: "%s · Cuốn Sổ tình iu" },
  description: "Cuốn sổ lưu những bức ảnh, ngày tháng và địa điểm của hai đứa.",
  applicationName: "Cuốn Sổ tình iu",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-192.png",
  },
  other: { "codex-preview": "development" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFF9F2",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <a className="skip-link" href="#noi-dung">Đến nội dung chính</a>
        {children}
      </body>
    </html>
  );
}
