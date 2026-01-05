import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { DetailsProvider } from "@/components/common/details";

const ibmSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LYNTOS | Vergi ve Uyum Kokpiti",
  description: "SMMM Ofisleri icin Kurumsal Denetim Paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning className={`${ibmSans.variable} ${ibmMono.variable}`}>
      <body className="font-sans bg-background text-foreground">
        <ThemeProvider>
          <QueryProvider>
            <DetailsProvider>
              {children}
            </DetailsProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
