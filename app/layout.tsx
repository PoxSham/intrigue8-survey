import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Docket by Intrigue8 — Your Business Brain",
  description:
    "The contractor OS built for Irish tradespeople. Voice note in, invoice out in 60 seconds. Join as a founding member for €49/month, locked forever.",
  openGraph: {
    title: "Docket by Intrigue8 — Your Business Brain",
    description:
      "Voice note in, invoice out in 60 seconds. Built for Irish contractors.",
    url: "https://intrigue8.ie",
    siteName: "Intrigue8",
    locale: "en_IE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Docket by Intrigue8",
    description: "Voice note in, invoice out in 60 seconds.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plusJakarta.variable}`} style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
