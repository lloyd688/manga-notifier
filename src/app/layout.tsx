import type { Metadata } from "next";
import { Chonburi } from "next/font/google";
import "./globals.css";

const chonburi = Chonburi({
  weight: "400",
  subsets: ["thai", "latin"],
  variable: "--font-chonburi",
});

export const metadata: Metadata = {
  title: "Manga Notifier",
  description: "จัดการตารางงานมังงะ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body
        className={`${chonburi.variable} font-chonburi bg-black text-gray-200 antialiased relative overflow-x-hidden`}
      >
        {/* Ambient Background Effects */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/40 rounded-full blur-[100px] opacity-70 animate-pulse" />
          <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-blue-900/40 rounded-full blur-[100px] opacity-60" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-900/40 rounded-full blur-[120px] opacity-70" />
          <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-cyan-900/40 rounded-full blur-[100px] opacity-60" />
        </div>

        <main className="min-h-screen container mx-auto p-4 z-10 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
