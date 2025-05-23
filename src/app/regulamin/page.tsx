import { Logo } from "@/components/ui/custom/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Regulamin() {
  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-3xl shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-center text-sky-950">
              Regulamin świadczenia usług drogą elektroniczną serwisu AliMatrix
            </h1>
            <p className="text-center text-sm text-gray-600">
              Wersja: 1.0 | Data publikacji: 23.05.2025
            </p>

            <div className="space-y-5 text-sky-950">
              <div>
                <h2 className="text-xl font-bold">§1. Postanowienia ogólne</h2>
                <p className="mt-2">
                  Niniejszy Regulamin określa zasady świadczenia usług drogą
                  elektroniczną za pośrednictwem serwisu internetowego
                  AliMatrix, dostępnego pod adresem: www.alimatrix.pl, zwanego
                  dalej „Serwisem".
                </p>
                <p className="mt-2">
                  Operatorem Serwisu i podmiotem świadczącym usługi drogą
                  elektroniczną jest:
                </p>
                <p className="mt-2 pl-4">
                  Miłosz Malinowski prowadzący działalność gospodarczą pod firmą
                  AliMatrix Miłosz Malinowski, wpisany do CEIDG, NIP:
                  716-267-30-69, adres do kontaktu: kontakt@alimatrix.pl.
                </p>
                <p className="mt-2">
                  Regulamin sporządzono w języku polskim, który jest wersją
                  obowiązującą.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  §2. Zakres i charakter usług
                </h2>
                <p className="mt-2">
                  Serwis umożliwia Użytkownikom dobrowolne przekazanie
                  informacji dotyczących spraw alimentacyjnych za pomocą
                  formularza online.
                </p>
                <p className="mt-2">
                  Usługa świadczona drogą elektroniczną polega na:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>udostępnieniu formularza,</li>
                  <li>
                    zapisaniu przesłanych danych w zabezpieczonym systemie,
                  </li>
                  <li>przetwarzaniu tych danych w celach:</li>
                  <ol className="list-decimal list-inside ml-8 space-y-1">
                    <li>statystycznych i analitycznych,</li>
                    <li>
                      rozwojowych, związanych z udoskonalaniem modelu działania
                      Serwisu,
                    </li>
                    <li>
                      przygotowania indywidualnych raportów dotyczących sytuacji
                      alimentacyjnych Użytkownika, które będą dostarczane
                      odpłatnie lub nieodpłatnie,
                    </li>
                    <li>
                      udostępniania zbiorczych, anonimowych danych
                      statystycznych partnerom społecznym, organizacjom
                      badawczym oraz – w uzasadnionych przypadkach – podmiotom
                      komercyjnym, o ile ich wykorzystanie pozostaje w zgodzie z
                      celami Serwisu i nie narusza prywatności Użytkowników.
                    </li>
                  </ol>
                </ul>
                <p className="mt-2">
                  Na etapie MVP Serwis nie oferuje jeszcze odpłatnych
                  funkcjonalności, jednak dane zebrane obecnie – na podstawie
                  wyrażonej zgody – będą służyły do przygotowania indywidualnych
                  raportów, które zostaną udostępnione użytkownikom w
                  późniejszym etapie rozwoju Serwisu.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§3. Warunki techniczne</h2>
                <p className="mt-2">Do korzystania z Serwisu wymagane są:</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>urządzenie z dostępem do Internetu,</li>
                  <li>
                    aktualna przeglądarka internetowa obsługująca JavaScript i
                    cookies.
                  </li>
                </ul>
                <p className="mt-2">
                  Operator nie ponosi odpowiedzialności za brak możliwości
                  korzystania z Serwisu wynikający z niespełnienia powyższych
                  wymagań.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">
                  §4. Zasady korzystania z Serwisu
                </h2>
                <p className="mt-2">
                  Korzystanie z Serwisu jest dobrowolne i bezpłatne.
                </p>
                <p className="mt-2">
                  Użytkownik zobowiązany jest do korzystania z Serwisu w sposób
                  zgodny z obowiązującym prawem, niniejszym Regulaminem oraz
                  dobrymi obyczajami.
                </p>
                <p className="mt-2">
                  Niedozwolone jest podawanie w formularzu danych osobowych osób
                  trzecich umożliwiających ich jednoznaczną identyfikację (np.
                  imię i nazwisko, PESEL, adres, e-mail), chyba że użytkownik
                  posiada ku temu odpowiednią podstawę prawną.
                </p>
                <p className="mt-2">
                  Użytkownik może przekazać informacje dotyczące drugiego
                  rodzica dziecka wyłącznie w zakresie niezbędnym do
                  przygotowania analizy alimentacyjnej, bez ujawniania danych
                  identyfikujących tę osobę.
                </p>
                <p className="mt-2">
                  Operator zastrzega sobie prawo do zablokowania lub usunięcia
                  zgłoszeń zawierających treści nieprawdziwe, obraźliwe,
                  naruszające prawo lub zasady współżycia społecznego.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§5. Odpowiedzialność</h2>
                <p className="mt-2">
                  Operator dokłada należytej staranności, aby Serwis
                  funkcjonował poprawnie i bezpiecznie.
                </p>
                <p className="mt-2">
                  Operator nie ponosi odpowiedzialności za:
                </p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>
                    skutki wykorzystania przez Użytkownika informacji
                    udostępnionych za pośrednictwem Serwisu,
                  </li>
                  <li>
                    szkody wynikające z awarii technicznych niezależnych od
                    Operatora.
                  </li>
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-bold">§6. Reklamacje</h2>
                <p className="mt-2">
                  Wszelkie reklamacje związane z funkcjonowaniem Serwisu można
                  zgłaszać na adres: kontakt@alimatrix.pl.
                </p>
                <p className="mt-2">
                  Reklamacje będą rozpatrywane w terminie do 14 dni roboczych.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§7. Dane osobowe</h2>
                <p className="mt-2">
                  Dane przekazywane za pośrednictwem Serwisu są przetwarzane
                  zgodnie z przepisami RODO, w zakresie i na zasadach opisanych
                  w Polityce prywatności.
                </p>
                <p className="mt-2">Dane będą wykorzystywane:</p>
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>w celach analitycznych i statystycznych,</li>
                  <li>do rozwoju Serwisu,</li>
                  <li>
                    do przygotowania raportu dla Użytkownika, również w formie
                    odpłatnej.
                  </li>
                </ul>
                <p className="mt-2">
                  Dane kontaktowe (adres e-mail) są przechowywane oddzielnie od
                  danych analitycznych i wykorzystywane wyłącznie do realizacji
                  komunikacji związanej z raportem lub usługą.
                </p>
                <p className="mt-2">
                  Agregowane, anonimowe dane statystyczne będą udostępniane
                  podmiotom trzecim – w tym także komercyjnym – jeśli ich
                  wykorzystanie wspiera cele Serwisu i nie narusza prywatności
                  Użytkowników.
                </p>
                <p className="mt-2">
                  Szczegóły dotyczące przetwarzania danych oraz przysługujących
                  Użytkownikowi praw znajdują się w Polityce prywatności.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-bold">§8. Postanowienia końcowe</h2>
                <p className="mt-2">
                  Regulamin obowiązuje od dnia jego publikacji na stronie
                  Serwisu.
                </p>
                <p className="mt-2">
                  Operator zastrzega sobie prawo do zmiany Regulaminu. Zmiany
                  wchodzą w życie z chwilą ich opublikowania na stronie
                  internetowej, chyba że z treści zmiany wynika inny termin.
                </p>
                <p className="mt-2">
                  Wszelkie spory wynikające z korzystania z Serwisu będą
                  rozpatrywane przez sąd właściwy dla siedziby Operatora.
                </p>
                <p className="mt-2">
                  W sprawach nieuregulowanych niniejszym Regulaminem
                  zastosowanie mają przepisy prawa polskiego, w szczególności
                  ustawa z dnia 18 lipca 2002 r. o świadczeniu usług drogą
                  elektroniczną oraz Kodeks cywilny.
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
