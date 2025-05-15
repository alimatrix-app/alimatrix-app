import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NavigationProvider } from "@/lib/navigation-context";

// Konfiguracja fontu
const inter = Inter({
  subsets: ["latin", "latin-ext"], // Obsługa polskich znaków
  weight: ["400", "500", "600", "700"],
  display: "swap", // Zapobiega "niewidzialnemu tekstowi" podczas ładowania fontu
  variable: "--font-inter", // Dostęp do fontu przez zmienną CSS
});

// Konfiguracja metadanych dla SEO
export const metadata: Metadata = {
  title: "AliMatrix - Kalkulator alimentów | Oblicz alimenty online",
  description:
    "AliMatrix to narzędzie oparte na danych, pomagające ustalić wysokość alimentów w Polsce w oparciu o rzeczywiste orzeczenia i sytuacje.",
  /* 
  // Open Graph dla lepszego udostępniania w mediach społecznościowych
  openGraph: {
    title: "AliMatrix - Alimenty bez tajemnic",
    description:
      "Sprawdź, jakie alimenty przyznawane są w przypadkach podobnych do Twojego.",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
    locale: "pl_PL",
    type: "website",
  },

  // Ikony
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
 */
  // Dodatkowe przydatne metadane
  keywords: [
    "alimenty",
    "kalkulator alimentów",
    "prawo rodzinne",
    "opieka nad dzieckiem",
  ],
  robots: { index: true, follow: true },
  authors: [{ name: "AliMatrix" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className={inter.variable}>
      <body className={`${inter.className} antialiased bg-sky-50`}>
        <NavigationProvider>
          {/* Banner informacyjny */}
          <div className="bg-sky-950 text-white py-2 text-center text-sm font-medium">
            ⚠️ Wersja demonstracyjna - AliMatrix ⚠️
          </div>

          {/* Główna zawartość */}
          <main className="min-h-screen">{children}</main>

          {/* Stopka */}
          <footer className="py-3 text-center text-sm mt-8">
            <p>
              © {new Date().getFullYear()} AliMatrix -
              <a href="/rodo" className="hover:underline ml-1 mr-1">
                RODO
              </a>{" "}
              -
              <a href="/polityka-prywatnosci" className="hover:underline ml-1">
                Polityka Prywatności
              </a>
            </p>
          </footer>
        </NavigationProvider>
      </body>
    </html>
  );
}
