import { Baloo_2, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./prototype-latest.css";
import "./forms.css";

// Brand type: Baloo 2 for the wordmark and headings, Plus Jakarta Sans for running text.
// Exposed as CSS variables and consumed through --font-display / --font-body in globals.css.
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-baloo",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth" className={`${baloo.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  );
}
