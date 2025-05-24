import { Logo } from "@/components/ui/custom/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function PolitykaPrywatnosci() {
  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-3xl shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-center text-sky-950">
              Kontakt
            </h1>
            <p className="text-center text-sm text-gray-600">
              Wersja: 1.0 | Data publikacji: 23.05.2025
            </p>

            <div className="space-y-5 text-sky-950">
              <div>
                <p className="mt-2">
                  W sprawach związanych z działaniem serwisu AliMatrix oraz
                  ochroną danych osobowych prosimy o kontakt:
                </p>
                <p className="mt-2">e-mail: kontakt@alimatrix.pl</p>
                <p className="mt-2">telefon: +48 507-095-368</p>
                <p className="mt-2">
                  Administratorem danych jest Miłosz Malinowski, właściciel
                  działalności gospodarczej zarejestrowanej w CEIDG pod nazwą
                  AliMatrix Miłosz Malinowski, NIP: 716-267-30-69
                </p>
              </div>
            </div>

            <div className="pt-6">
              <Link href="/sciezka" passHref>
                <Button className="w-full">Powrót do formularza</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
