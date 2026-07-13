import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { auth } from "@/lib/auth";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: {
    default: "CompanyHub — Company-wise LeetCode Prep",
    template: "%s · CompanyHub",
  },
  description:
    "Company-wise LeetCode interview questions with frequency data, curated sheets, progress tracking, spaced revision, and notes.",
  keywords: ["leetcode", "interview prep", "company-wise questions", "DSA", "coding interview"],
  openGraph: {
    title: "CompanyHub — Company-wise LeetCode Prep",
    description: "Know exactly what each company asks. Track every solve.",
    type: "website",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable} ${mono.variable} font-sans`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
