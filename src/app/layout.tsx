import type { Metadata } from "next";
import { Chonburi, Prompt } from "next/font/google"; // Import Prompt
import "./globals.css";

const chonburi = Chonburi({
  weight: "400",
  subsets: ["thai", "latin"],
  variable: "--font-chonburi",
});

const prompt = Prompt({
  weight: ["300", "400", "500", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
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
        className={`${chonburi.variable} ${prompt.variable} font-prompt bg-[#0a0a0a] text-white antialiased relative overflow-x-hidden`}
      >
        {/* Living Background */}
        <div className="fixed inset-0 -z-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-black to-black" />

        {/* Animated Mesh Gradient */}
        <div className="fixed inset-0 -z-10 opacity-60">
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen animate-blob" />
          <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-20%] left-[20%] w-[80%] h-[80%] rounded-full bg-pink-600/20 blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />
        </div>

        <main className="min-h-screen container mx-auto p-4 z-10 relative">
          {children}
        </main>
      </body>
    </html>
  );
}
