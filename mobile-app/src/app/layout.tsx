import type { Metadata } from "next";
import "./globals.css";
import { PWAProvider } from "@/components/pwa-provider";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";

export const metadata: Metadata = {
  title: "Glife WMS",
  description: "Mobile Warehouse Inventory Management & High-Speed Picking System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <head>
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full flex flex-col bg-black text-white">
        <PWAProvider />
        <NetworkStatusIndicator />
        {children}
      </body>
    </html>
  );
}
