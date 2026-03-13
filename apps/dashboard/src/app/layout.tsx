import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/components/dashboard/DataProvider";

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
      <body className={`${inter.className} bg-[#030014] antialiased min-h-screen text-gray-100 font-mono selection:bg-purple-500/30`}>
        <DataProvider>
          {children}
        </DataProvider>
      </body>
    </html>
  );
}
