import { Poppins, Cormorant_Garamond, Yellowtail } from "next/font/google";
import StoreProviders from "@/components/StoreProviders";
import "./globals.css";

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-poppins" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
});
const script = Yellowtail({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-script",
});

export const metadata = {
  title: "Al Qirat Perfumes | Luxury Perfumes & Attars",
  icons: {
    icon: "/fevicon.png",
    shortcut: "/fevicon.png",
    apple: "/fevicon.png",
  },
  description:
    "Al Qirat Perfumes — the fragrance of luxury, the hallmark of refined taste. Discover premium perfumes, attars and gift sets.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${cormorant.variable} ${script.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <StoreProviders>{children}</StoreProviders>
      </body>
    </html>
  );
}
