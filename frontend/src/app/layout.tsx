import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/common/Providers";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Helix — AI-Native Project Management",
    template: "%s | Helix",
  },
  description:
    "The enterprise-grade, AI-native project management platform. Track issues, manage sprints, plan roadmaps — powered by AI.",
  keywords: ["project management", "issue tracking", "sprints", "AI", "kanban", "roadmap"],
  authors: [{ name: "Helix Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://helix.app",
    siteName: "Helix",
    title: "Helix — AI-Native Project Management",
    description:
      "Enterprise-grade project management platform powered by AI.",
  },
  robots: { index: false, follow: false }, // Private SaaS
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
