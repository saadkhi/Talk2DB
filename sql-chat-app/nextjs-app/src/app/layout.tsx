import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: "Talk2DB - SQL Chatbot",
  description: "Convert natural language to SQL queries",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Satoshi — modern geometric sans, served via Fontshare CDN */}
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,800,900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
