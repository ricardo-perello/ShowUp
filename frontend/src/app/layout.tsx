import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SuiProvider } from "@/components/providers/SuiProvider";
import { DebugInfo } from "@/components/DebugInfo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShowUp - Web3 Event Reservations",
  description: "Decentralized event reservations and attendance protocol on Sui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SuiProvider>
          {children}
          <DebugInfo />
        </SuiProvider>
      </body>
    </html>
  );
}
