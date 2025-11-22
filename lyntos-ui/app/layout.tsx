import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { DetailsProvider } from "@/components/common/details";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LYNTOS Dashboard",
  description: "Modernized UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
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
