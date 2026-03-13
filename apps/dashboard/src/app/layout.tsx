import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SSEProvider } from "@/components/dashboard/SSEProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Oracle Sniper | AI Trading Terminal",
  description: "Autonomous Prediction Market AI Agent Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#030014] antialiased`}>
        <SSEProvider>
          {children}
        </SSEProvider>
      </body>
    </html>
  );
}
