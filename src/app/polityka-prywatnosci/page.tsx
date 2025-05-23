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
              Polityka prywatności serwisu AliMatrix
            </h1>
            <p className="text-center text-sm text-gray-600">
              Wersja: 1.0 | Data publikacji: 23.05.2025
            </p>

            <div className="space-y-5 text-sky-950">
              <div>
                <h2 className="text-xl font-bold">§1. Postanowienia ogólne</h2>
                <p className="mt-2">
                  Niniejsza Polityka prywatności określa zasady przetwarzania i
                  ochrony danych osobowych przekazanych przez Użytkowników za
                  pośrednictwem formularza dostępnego w serwisie internetowym
                  AliMatrix, dostępnego pod adresem: www.alimatrix.pl.
                </p>
                <p className="mt-2">Administratorem danych osobowych jest:</p>
                <p className="mt-2 pl-4">
                  Miłosz Malinowski prowadzący działalność gospodarczą pod firmą
                  AliMatrix Miłosz Malinowski, wpisany do CEIDG, NIP:
                  716-267-30-69, adres do kontaktu: kontakt@alimatrix.pl.
                </p>
                <p className="mt-2">
                  Polityka prywatności stanowi integralną część Regulaminu.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  §2. Rodzaje zbieranych danych
                </h2>
                <p className="mt-2">
                  Za pośrednictwem formularza Serwis zbiera następujące dane:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>adres e-mail Użytkownika (opcjonalnie),</li>
                  <li>informacje o sytuacji ekonomicznej Użytkownika,</li>
                  <li>
                    informacje o sytuacji osobistej i rodzinnej Użytkownika,
                  </li>
                  <li>
                    informacje o dzieciach (bez danych identyfikacyjnych),
                  </li>
                  <li>informacje o sytuacji mieszkaniowej,</li>
                  <li>
                    informacje dotyczące drugiego rodzica (bez danych
                    identyfikacyjnych).
                  </li>
                </ul>
                <p className="mt-2">Ponadto Serwis automatycznie gromadzi:</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>adres IP urządzenia,</li>
                  <li>informacje o przeglądarce internetowej,</li>
                  <li>informacje zawarte w plikach cookies.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  §3. Cele przetwarzania danych
                </h2>
                <p className="mt-2">
                  Dane osobowe Użytkowników przetwarzane są w celu:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>realizacji usług świadczonych przez Serwis,</li>
                  <li>przeprowadzania analiz statystycznych,</li>
                  <li>tworzenia raportów i analiz na potrzeby Użytkownika,</li>
                  <li>doskonalenia funkcjonalności Serwisu,</li>
                  <li>
                    tworzenia zanonimizowanych zestawień statystycznych na cele
                    badawcze i rozwojowe.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  §4. Podstawy prawne przetwarzania danych
                </h2>
                <p className="mt-2">
                  Dane osobowe Użytkowników Serwisu przetwarzane są na
                  następujących podstawach prawnych:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    zgoda Użytkownika (art. 6 ust. 1 lit. a RODO) – w
                    odniesieniu do danych przekazywanych w formularzu,
                  </li>
                  <li>
                    prawnie uzasadniony interes Administratora (art. 6 ust. 1
                    lit. f RODO) – w zakresie danych zbieranych automatycznie.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  §5. Okres przechowywania danych
                </h2>
                <p className="mt-2">
                  Dane osobowe Użytkowników przechowywane są przez okres:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    do czasu wycofania zgody przez Użytkownika – w przypadku
                    danych przetwarzanych na podstawie zgody,
                  </li>
                  <li>
                    do czasu zgłoszenia skutecznego sprzeciwu – w przypadku
                    danych przetwarzanych na podstawie prawnie uzasadnionego
                    interesu Administratora,
                  </li>
                  <li>
                    maksymalnie przez okres 3 lat od momentu ostatniej
                    aktywności Użytkownika w Serwisie.
                  </li>
                </ul>
                <p className="mt-2">
                  Po upływie okresu przechowywania dane zostaną usunięte lub
                  zanonimizowane.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§6. Udostępnianie danych</h2>
                <p className="mt-2">Dane Użytkowników mogą być udostępniane:</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    dostawcom usług hostingowych i IT – w zakresie niezbędnym do
                    utrzymania infrastruktury Serwisu,
                  </li>
                  <li>
                    partnerom analitycznym – wyłącznie w formie zanonimizowanej,
                    zbiorczej, uniemożliwiającej identyfikację konkretnych osób.
                  </li>
                </ul>
                <p className="mt-2">
                  Administrator nie przekazuje danych do państw trzecich ani
                  organizacji międzynarodowych, chyba że jest to niezbędne do
                  świadczenia usług, a podmiot odbierający dane zapewnia
                  odpowiedni poziom ich ochrony.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§7. Prawa Użytkowników</h2>
                <p className="mt-2">
                  Użytkownikowi przysługują następujące prawa związane z
                  przetwarzaniem danych osobowych:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>prawo dostępu do swoich danych,</li>
                  <li>prawo do sprostowania danych,</li>
                  <li>prawo do usunięcia danych,</li>
                  <li>prawo do ograniczenia przetwarzania,</li>
                  <li>prawo do przenoszenia danych,</li>
                  <li>prawo do sprzeciwu wobec przetwarzania,</li>
                  <li>prawo do wycofania zgody w dowolnym momencie.</li>
                </ul>
                <p className="mt-2">
                  Aby skorzystać z powyższych praw, należy skontaktować się z
                  Administratorem poprzez adres e-mail: kontakt@alimatrix.pl.
                </p>
                <p className="mt-2">
                  Użytkownikowi przysługuje także prawo wniesienia skargi do
                  Prezesa Urzędu Ochrony Danych Osobowych.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§8. Pliki cookies</h2>
                <p className="mt-2">
                  Serwis wykorzystuje pliki cookies, które są zapisywane na
                  urządzeniu końcowym Użytkownika.
                </p>
                <p className="mt-2">Wykorzystujemy pliki cookies w celu:</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    dostosowania zawartości strony do preferencji Użytkownika,
                  </li>
                  <li>analizy ruchu na stronie,</li>
                  <li>zapewnienia prawidłowego działania formularzy.</li>
                </ul>
                <p className="mt-2">
                  Użytkownik może samodzielnie zmienić ustawienia dotyczące
                  cookies w swojej przeglądarce internetowej, w tym całkowicie
                  zablokować ich zapisywanie lub każdorazowo wyświetlać
                  komunikat o próbie zapisania plików cookies.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§9. Bezpieczeństwo danych</h2>
                <p className="mt-2">
                  Administrator stosuje odpowiednie środki techniczne i
                  organizacyjne, aby zapewnić ochronę przetwarzanych danych
                  osobowych, w tym m.in.:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>szyfrowanie połączenia przy pomocy certyfikatu SSL,</li>
                  <li>regularne aktualizacje oprogramowania,</li>
                  <li>kontrolę dostępu do danych,</li>
                  <li>tworzenie kopii zapasowych.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  §10. Zmiany Polityki prywatności
                </h2>
                <p className="mt-2">
                  Administrator zastrzega sobie prawo do zmiany Polityki
                  prywatności.
                </p>
                <p className="mt-2">
                  Wszelkie zmiany będą publikowane na stronie Serwisu.
                </p>
                <p className="mt-2">
                  Korzystanie z Serwisu po wprowadzeniu zmian oznacza ich
                  akceptację.
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
