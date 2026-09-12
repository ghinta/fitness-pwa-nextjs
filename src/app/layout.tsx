import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppProvider } from "@/components/app-provider";
import { AppShell } from "@/components/app-shell";
import { APP_DESCRIPTION, APP_NAME, BASE_PATH } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  manifest: `${BASE_PATH}/manifest.webmanifest`,
  icons: {
    icon: `${BASE_PATH}/icons/icon.svg`,
    apple: `${BASE_PATH}/icons/icon-180.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Fitness",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#052e2b",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className="h-full">
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-src 'none'; frame-ancestors 'none'; manifest-src 'self'; worker-src 'self' blob:"
        />
      </head>
      <body className="min-h-full">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
