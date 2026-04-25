import type { Metadata } from "next";
import {
  DM_Serif_Display,
  Lora,
  Caveat,
  JetBrains_Mono,
  Cinzel_Decorative,
  Over_the_Rainbow,
} from "next/font/google";
import "./globals.css";
import "mapbox-gl/dist/mapbox-gl.css";

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const overTheRainbow = Over_the_Rainbow({
  variable: "--font-over-the-rainbow",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "guardei — um caderno de memórias",
  description: "Guarde suas memórias no mapa. Cada lugar, cada momento.",
};

const fontVars = [
  dmSerifDisplay.variable,
  lora.variable,
  caveat.variable,
  jetbrainsMono.variable,
  cinzelDecorative.variable,
  overTheRainbow.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${fontVars} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
