import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradePulse — Live Markets",
  description: "Real-time cryptocurrency and forex trading dashboard with live price streaming.",
  keywords: ["crypto", "forex", "trading", "dashboard", "BTC", "XAU", "live prices"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#0a0e1a] text-[#f1f5f9]">
        {children}
      </body>
    </html>
  );
}
