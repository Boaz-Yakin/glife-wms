import * as React from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

export const metadata = {
  title: "Glife WMS Admin Portal",
  description: "Web dashboard for managing WMS data",
  icons: {
    icon: '/G-WMS.png',
    shortcut: '/G-WMS.png',
    apple: '/G-WMS.png',
  },
  other: {
    google: "notranslate",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="antialiased min-h-screen notranslate">
        <TooltipProvider>
          {children}
          <Toaster position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
