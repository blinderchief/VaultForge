import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { Syne } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VaultForge — ZK-Private Collateral Vaults",
  description: "Non-custodial ZK-private intelligent collateral vault system on opBNB/BSC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${syne.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <Navbar />
          <main className="pt-14">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
