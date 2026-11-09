import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HeadmasterShell from "@/components/HeadmasterShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Headmaster Dashboard",
  description: "School Headmaster Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <HeadmasterShell>{children}</HeadmasterShell>
      </body>
    </html>
  );
}