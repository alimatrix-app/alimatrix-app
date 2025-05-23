import { Logo } from "@/components/ui/custom/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <div className="space-y-6">
            <div className="space-y-4 text-sky-950">
              <p>
                <strong>AliMatrix</strong> to niezależna inicjatywa oparta na
                rzeczywistych danych. Pokazujemy, jak w praktyce rodzice w
                Polsce dzielą się kosztami utrzymania dzieci – w różnych
                sytuacjach życiowych, różnych układach opieki i różnych
                decyzjach sądowych. Chcemy, żeby ustalenia dotyczące alimentów
                były bardziej przejrzyste, a mniej zależne od przypadku.
              </p>
              <p>
                Rozwód, rozstanie, ustalanie sposobu finansowania potrzeb
                dziecka – to momenty, które rodzą wiele pytań i niepewności. W
                polskim systemie brakuje jasnych standardów, a decyzje sądowe
                często znacząco się różnią.{" "}
                <strong>AliMatrix powstał po to, by to zmienić</strong> – przez
                analizę rzeczywistych przypadków i budowę narzędzia opartego na
                danych, nie na opiniach.
              </p>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="font-semibold mb-2">Wypełniając ten formularz:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>otrzymasz spersonalizowany raport</strong>, który
                    pokaże, jak Twoja sytuacja wygląda na tle innych podobnych
                    przypadków (pierwsze 1000 osób – bezpłatnie)
                  </li>
                  <li>
                    pomagasz stworzyć{" "}
                    <strong>
                      pierwszą w Polsce bazę danych alimentacyjnych
                    </strong>
                    , która może realnie zmienić system
                  </li>
                  <li>
                    masz wpływ na{" "}
                    <strong>większą przewidywalność i uczciwość</strong> w
                    sprawach dotyczących dzieci.
                  </li>
                </ul>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                <p className="text-sm">
                  <strong>
                    Uwaga: obecnie zbieramy dane do stworzenia pierwszych
                    raportów.
                  </strong>{" "}
                  Aby raporty były wiarygodne i naprawdę użyteczne, potrzebujemy
                  odpowiedniej liczby spójnych przypadków.{" "}
                  <strong>
                    Po osiągnięciu wymaganej liczby odpowiedzi, przygotujemy i
                    bezpłatnie udostępnimy raporty pierwszym 1000 osobom
                  </strong>
                  , które wypełniły formularz - Dostęp do raportów będzie w
                  przyszłości odpłatny.{" "}
                  <strong>
                    O postępach i gotowości raportu będziemy Cię informować,
                    jeśli zdecydujesz się zostawić swój adres e-mail.
                  </strong>
                </p>
              </div>

              <p className="font-bold">
                Przewidywany czas wypełnienia: około 60 minut.
              </p>
            </div>
            <div className="text-sky-950">
              <p>
                To nie jest zwykła ankieta – to proces, który może przynieść
                wartość także Tobie.{" "}
                <strong>
                  Odpowiadając na pytania, być może lepiej zrozumiesz swoją
                  sytuację
                </strong>
                , zobaczysz ją w szerszym kontekście i zyskasz wskazówki, które
                pomogą w dalszych decyzjach.{" "}
                <strong>
                  Twoje odpowiedzi z kolei pozwolą AliMatrix tworzyć trafniejsze
                  estymacje
                </strong>{" "}
                – zarówno dla Ciebie, jak i dla innych osób w podobnej sytuacji.
              </p>
              <p className="font-semibold mt-4">
                Formularz został podzielony na kilka przejrzystych części:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-4">
                <li>
                  <strong>Informacje o dzieciach</strong> – obejmujące m.in.
                  opiekę, edukację oraz miesięczne wydatki związane z
                  wychowaniem.
                </li>
                <li>
                  <strong>Finanse rodziców</strong> – dane o dochodach, kosztach
                  utrzymania i innych zobowiązaniach po stronie każdego z
                  rodziców
                </li>
                <li>
                  <strong>Kontekst ustaleń finansowych</strong> - informacje o
                  tym, kiedy i w jaki sposób ustalono zasady finansowania
                  potrzeb dziecka (np. wyrok sądu, porozumienie, mediacje).
                </li>
                <li>
                  <strong>Dane użytkownika</strong> - podstawowe informacje,
                  które pomagają lepiej osadzić Twoją sytuację w analizach
                  statystycznych (np. wiek, województwo, stan cywilny).
                </li>
              </ul>
              <p className="text-sm mt-2">
                Po zakończeniu wypełniania formularza poprosimy Cię o wyrażenie
                <strong> osobnej zgody na przetwarzanie danych</strong> w celu
                przygotowania spersonalizowanego raportu.{" "}
                <strong>Jeśli zdecydujesz się podać adres e‑mail</strong>,
                będzie on przechowywany oddzielnie od pozostałych informacji.
                Twoje dane będą{" "}
                <strong>
                  pseudonimizowane i nie będą powiązane z Twoją tożsamością.
                  Możesz je w każdej chwili edytować lub usunąć.
                </strong>{" "}
                Przetwarzamy je zgodnie z <strong>RODO</strong>, stosując
                nowoczesne technologie ochrony prywatności i bezpieczeństwa.
              </p>
              <p className="text-sm mt-2">
                Wiemy, że odpowiedzi na pytania dotyczące sytuacji rodzinnej i
                finansowej mogą wymagać chwili zastanowienia. Dlatego formularz
                został zaprojektowany tak, by automatycznie zapisywać Twoje
                postępy. <strong>Możesz wypełniać go we własnym tempie</strong>{" "}
                – wracać do wcześniejszych odpowiedzi, poprawiać je lub
                uzupełniać, kiedy będziesz gotowy.
              </p>
              <p className="text-sm mt-2">
                Dokładne odpowiedzi pomogą zbudować obraz Twojej sytuacji tak,
                aby raport był dla Ciebie naprawdę użytecznym drogowskazem.{" "}
                <strong>
                  Każda precyzyjna informacja to krok ku większej przejrzystości
                  – dla Ciebie i dla tych, którzy pójdą Twoim śladem.
                </strong>
              </p>
            </div>
            <div className="pt-4">
              <Link href="/sciezka" passHref>
                <Button className="w-full">Rozpocznij</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
