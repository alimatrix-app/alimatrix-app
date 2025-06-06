import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#002645",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://alimatrix.pl"),
  title: {
    default: "AliMatrix - Kalkulator alimentów | Oblicz alimenty online",
    template: "%s | AliMatrix",
  },
  description:
    "AliMatrix to narzędzie oparte na danych, pomagające ustalić wysokość alimentów w Polsce w oparciu o rzeczywiste orzeczenia sądowe. Profesjonalny kalkulator alimentów.",

  openGraph: {
    title: "AliMatrix - Alimenty bez tajemnic",
    description:
      "Sprawdź, jakie alimenty przyznawane są w przypadkach podobnych do Twojego.",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
    locale: "pl_PL",
    type: "website",
    siteName: "AliMatrix",
  },

  robots: {
    index: true,
    follow: true,
  },

  authors: [{ name: "AliMatrix Team" }],

  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-sky-50`}>
        {/* Skip link dla accessibility - JEDYNA rzeczywista wartość */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-sky-600 focus:text-white focus:rounded-md"
        >
          Przejdź do głównej treści
        </a>

        {/* Poprawiona struktura HTML */}
        <div className="min-h-screen flex flex-col">
          <main id="main-content" className="flex-1">
            {children}
          </main>

          <footer className="mt-auto py-8 text-center text-sm bg-white border-t border-sky-100">
            <div className="container mx-auto px-4">
              <div className="mb-6">
                <Image
                  className="block mx-auto max-w-full h-auto"
                  src="/image_from_ios.gif"
                  width={500}
                  height={500}
                  alt="Dofinansowano ze środków Unii Europejskiej"
                  loading="lazy"
                />
              </div>

              <p className="text-gray-600">
                © 2025 AliMatrix. Wszystkie prawa zastrzeżone.
              </p>
            </div>
          </footer>
        </div>

        <Analytics />
      </body>
    </html>
  );
}
