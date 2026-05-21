import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SketchIt",
  description: "Draw. Guess. Have Fun!",
  icons: {
    icon: "/sketchit-logo.jpg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
