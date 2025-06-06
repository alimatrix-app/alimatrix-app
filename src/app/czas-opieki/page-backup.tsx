"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useFormStore } from "@/lib/store/form-store";
import {
  Dziecko,
  DzienCzasuOpieki,
  TabelaCzasu,
  TabeleCzasuOpieki,
  WskaznikiCzasuOpieki,
} from "./typings";
import {
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";

// Rozszerzony typ Dziecko z tabeleCzasuOpieki
type DzieckoRozszerzone = Dziecko & {
  tabeleCzasuOpieki?: TabeleCzasuOpieki;
};

export default function CzasOpieki() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // Style CSS dla ukrycia strzałek w polach numerycznych w tabeli
  const hideSpinnersStyle = `
    .czas-opieki-input::-webkit-inner-spin-button,
    .czas-opieki-input::-webkit-outer-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    .czas-opieki-input[type=number] {
      -moz-appearance: textfield;
    }
  `;
  // Funkcja scrollToTop zaimplementowana bezpośrednio w komponencie
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Inicjalizacja stanu dla aktualnego dziecka i danych tabeli
  const [aktualneDzieckoId] = useState<number | null>(
    formData.aktualneDzieckoWTabeliCzasu || null
  );
  const [cyklOpieki, setCyklOpieki] = useState<"1" | "2" | "4" | "custom">("1");
  const [aktywnyTydzien, setAktywnyTydzien] = useState<number>(1);

  // Funkcja do inicjalizacji pustej tabeli tygodnia
  const inicjalizujTabeleTygodnia = (): TabelaCzasu => ({
    pn: {
      poranek: 0,
      placowkaEdukacyjna: 0,
      czasPoEdukacji: 0,
      senURodzica: 0,
      senUDrugiegoRodzica: 0,
    },
    wt: {
      poranek: 0,
      placowkaEdukacyjna: 0,
      czasPoEdukacji: 0,
      senURodzica: 0,
      senUDrugiegoRodzica: 0,
    },
    sr: {
      poranek: 0,
      placowkaEdukacyjna: 0,
      czasPoEdukacji: 0,
      senURodzica: 0,
      senUDrugiegoRodzica: 0,
    },
    cz: {
      poranek: 0,
      placowkaEdukacyjna: 0,
      czasPoEdukacji: 0,
      senURodzica: 0,
      senUDrugiegoRodzica: 0,
    },
    pt: {
      poranek: 0,
      placowkaEdukacyjna: 0,
      czasPoEdukacji: 0,
      senURodzica: 0,
      senUDrugiegoRodzica: 0,
    },
    sb: {
      poranek: 0,
      placowkaEdukacyjna: 0,
      czasPoEdukacji: 0,
      senURodzica: 0,
      senUDrugiegoRodzica: 0,
    },
    nd: {
      poranek: 0,
      placowkaEdukacyjna: 0,
      czasPoEdukacji: 0,
      senURodzica: 0,
      senUDrugiegoRodzica: 0,
    },
  });

  // Inicjalizacja tabel czasu dla wszystkich tygodni
  const [tabeleCzasuOpieki, setTabeleCzasuOpieki] = useState<TabeleCzasuOpieki>(
    {
      1: inicjalizujTabeleTygodnia(),
    }
  );

  // Stany dla trzech wskaźników procentowych
  const [czasOpiekiBezEdukacji, setCzasOpiekiBezEdukacji] = useState<number>(0);
  const [czasAktywnejOpieki, setCzasAktywnejOpieki] = useState<number>(0);
  const [czasSnu, setCzasSnu] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Funkcja do obliczania wskaźników procentowych podziału czasu opieki na podstawie wszystkich tabel
  const obliczWskaznikiCzasuOpieki = (
    tabele: TabeleCzasuOpieki
  ): WskaznikiCzasuOpieki => {
    // Zmienne do obliczania wskaźników
    let sumaGodzinOpieki = 0;
    let sumaGodzinPlacowki = 0;
    let sumaGodzinSnu = 0;
    let sumaGodzinSnuDrugiegoRodzica = 0;
    let liczbaTygodni = Object.keys(tabele).length;

    // Stałe - łączna liczba godzin w całym cyklu opieki
    const totalGodzinWTygodniu = 7 * 24; // 168 godzin na tydzień
    const totalGodzinWCyklu = totalGodzinWTygodniu * liczbaTygodni;

    // Sumowanie godzin ze wszystkich tygodni
    Object.keys(tabele).forEach((tydzienKey) => {
      const tydzien = Number(tydzienKey);
      const tabela = tabele[tydzien];

      if (tabela) {
        Object.keys(tabela).forEach((dzienKey) => {
          const dzien = tabela[dzienKey];

          if (dzien) {
            // Suma godzin opieki bez placówki
            sumaGodzinOpieki +=
              dzien.poranek + dzien.czasPoEdukacji + dzien.senURodzica;

            // Suma godzin w placówce edukacyjnej
            sumaGodzinPlacowki += dzien.placowkaEdukacyjna || 0;

            // Suma godzin snu u wypełniającego rodzica
            sumaGodzinSnu += dzien.senURodzica || 0;

            // Suma godzin snu u drugiego rodzica
            sumaGodzinSnuDrugiegoRodzica += dzien.senUDrugiegoRodzica || 0;
          }
        });
      }
    });

    // 1. Łączny czas opieki (bez placówki edukacyjnej)
    const totalCzasBezPlacowki = Math.max(
      1,
      totalGodzinWCyklu - sumaGodzinPlacowki
    );
    const wskaznikCzasuBezEdukacji = Math.round(
      (sumaGodzinOpieki / totalCzasBezPlacowki) * 100
    );

    // 2. Czas aktywnej opieki (bez placówki i bez snu)
    const totalCzasAktywny = Math.max(
      1,
      totalCzasBezPlacowki - sumaGodzinSnu - sumaGodzinSnuDrugiegoRodzica
    );
    const wskaznikAktywnejOpieki = Math.round(
      ((sumaGodzinOpieki - sumaGodzinSnu) / totalCzasAktywny) * 100
    );

    // 3. Czas nocnego snu pod opieką (procentowo)
    const totalCzasSnu = sumaGodzinSnu + sumaGodzinSnuDrugiegoRodzica;
    const wskaznikSnu =
      totalCzasSnu > 0 ? Math.round((sumaGodzinSnu / totalCzasSnu) * 100) : 0;

    // Aktualizacja stanów
    setCzasOpiekiBezEdukacji(wskaznikCzasuBezEdukacji);
    setCzasAktywnejOpieki(wskaznikAktywnejOpieki);
    setCzasSnu(wskaznikSnu);

    // Zwróć obliczone wskaźniki
    return {
      czasOpiekiBezEdukacji: wskaznikCzasuBezEdukacji,
      czasAktywnejOpieki: wskaznikAktywnejOpieki,
      czasSnu: wskaznikSnu,
    };
  };

  // Funkcja zwracająca liczbę tygodni na podstawie wybranego cyklu opieki
  const getLiczbaTygodni = (cykl: string): number => {
    switch (cykl) {
      case "1":
        return 1;
      case "2":
        return 2;
      case "4":
      case "custom":
        return 4;
      default:
        return 1;
    }
  };

  // Efekt do aktualizacji liczby tygodni po zmianie cyklu opieki
  useEffect(() => {
    const liczbaTygodni = getLiczbaTygodni(cyklOpieki);
    const aktualneTygodnie = Object.keys(tabeleCzasuOpieki).map(Number);
    const noweTabeleCzasu = { ...tabeleCzasuOpieki };

    // Usuwanie nadmiarowych tygodni
    aktualneTygodnie.forEach((tydzien) => {
      if (tydzien > liczbaTygodni) {
        delete noweTabeleCzasu[tydzien];
      }
    });

    // Dodawanie brakujących tygodni
    for (let i = 1; i <= liczbaTygodni; i++) {
      if (!noweTabeleCzasu[i]) {
        noweTabeleCzasu[i] = inicjalizujTabeleTygodnia();
      }
    }

    setTabeleCzasuOpieki(noweTabeleCzasu);

    // Upewniamy się, że aktywny tydzień jest w prawidłowym zakresie
    if (aktywnyTydzien > liczbaTygodni) {
      setAktywnyTydzien(1);
    }
  }, [cyklOpieki]);

  // Wczytaj dane dziecka i tabeli z store'a, jeśli istnieją
  useEffect(() => {
    if (formData.dzieci && aktualneDzieckoId) {
      const dziecko = formData.dzieci.find(
        (d) => d.id === aktualneDzieckoId
      ) as DzieckoRozszerzone | undefined;

      if (dziecko && dziecko.cyklOpieki) {
        setCyklOpieki(dziecko.cyklOpieki);
      }

      if (dziecko && dziecko.tabeleCzasuOpieki) {
        setTabeleCzasuOpieki(dziecko.tabeleCzasuOpieki);
        // Oblicz wskaźniki czasu opieki na podstawie wczytanej tabeli
        obliczWskaznikiCzasuOpieki(dziecko.tabeleCzasuOpieki);
      }

      // Jeśli dziecko ma już zapisane wskaźniki czasu opieki, użyj ich
      if (
        dziecko &&
        "wskaznikiCzasuOpieki" in dziecko &&
        dziecko.wskaznikiCzasuOpieki
      ) {
        const wskazniki = dziecko.wskaznikiCzasuOpieki;
        if (wskazniki.czasOpiekiBezEdukacji !== undefined) {
          setCzasOpiekiBezEdukacji(wskazniki.czasOpiekiBezEdukacji);
        }
        if (wskazniki.czasAktywnejOpieki !== undefined) {
          setCzasAktywnejOpieki(wskazniki.czasAktywnejOpieki);
        }
        if (wskazniki.czasSnu !== undefined) {
          setCzasSnu(wskazniki.czasSnu);
        }
      }
    }
  }, [formData.dzieci, aktualneDzieckoId]);

  // Znajdź wszystkie dzieci z modelem opieki "inny"
  const dzieciZModelemInnym =
    formData.dzieci?.filter((d) => d.modelOpieki === "inny") || [];

  // Znajdź aktualne dziecko
  const aktualneDziecko = formData.dzieci?.find(
    (d) => d.id === aktualneDzieckoId
  );

  // Funkcja do aktualizacji danych w tabeli czasu dla konkretnego tygodnia
  const updateTabelaCzasu = (
    tydzien: number,
    dzien: string,
    kategoria: string,
    wartosc: number
  ) => {
    setTabeleCzasuOpieki((prev) => {
      // Bezpieczne klonowanie poprzedniego stanu
      const newTabeleCzasu = { ...prev };

      // Sprawdzenie czy istnieje dany tydzień i dzień, jeśli nie - inicjalizujemy
      if (!newTabeleCzasu[tydzien]) {
        newTabeleCzasu[tydzien] = inicjalizujTabeleTygodnia();
      }

      if (!newTabeleCzasu[tydzien][dzien]) {
        newTabeleCzasu[tydzien][dzien] = {
          poranek: 0,
          placowkaEdukacyjna: 0,
          czasPoEdukacji: 0,
          senURodzica: 0,
          senUDrugiegoRodzica: 0,
        };
      }

      // Aktualizacja wartości
      newTabeleCzasu[tydzien] = {
        ...newTabeleCzasu[tydzien],
        [dzien]: {
          ...newTabeleCzasu[tydzien][dzien],
          [kategoria]: wartosc,
        },
      };

      // Weryfikacja sum godzin dziennych - nie może przekraczać 24h
      const dzienData = newTabeleCzasu[tydzien][dzien];
      const suma =
        dzienData.poranek +
        dzienData.placowkaEdukacyjna +
        dzienData.czasPoEdukacji +
        dzienData.senURodzica +
        dzienData.senUDrugiegoRodzica;

      if (suma > 24) {
        setError(
          `Suma godzin dla tygodnia ${tydzien}, ${getDzienNazwa(
            dzien
          )} przekracza 24 godziny.`
        );
      } else {
        setError(null);
      }

      // Po aktualizacji tabeli, oblicz wskaźniki czasu opieki
      obliczWskaznikiCzasuOpieki(newTabeleCzasu);

      return newTabeleCzasu;
    });
  };

  // Funkcja do obsługi zmiany cyklu opieki
  const handleCyklOpiekiChange = (value: string) => {
    setCyklOpieki(value as "1" | "2" | "4" | "custom");
  };

  // Funkcja do zapisania danych i przejścia do następnego dziecka lub następnego kroku
  const handleNext = () => {
    // Walidacja danych
    let hasError = false;
    let errorMessage = "";

    // Sprawdzamy czy suma godzin w każdym dniu nie przekracza 24
    Object.entries(tabeleCzasuOpieki).forEach(([tydzienStr, tabela]) => {
      const tydzien = Number(tydzienStr);

      Object.entries(tabela).forEach(([dzien, dane]) => {
        // Zapewniamy, że dane to obiekt typu DzienCzasuOpieki
        const dzienDane = dane as DzienCzasuOpieki;

        const suma =
          dzienDane.poranek +
          dzienDane.placowkaEdukacyjna +
          dzienDane.czasPoEdukacji +
          dzienDane.senURodzica +
          dzienDane.senUDrugiegoRodzica;

        if (suma > 24) {
          hasError = true;
          errorMessage = `Suma godzin dla tygodnia ${tydzien}, ${getDzienNazwa(
            dzien
          )} przekracza 24 godziny.`;
        }
      });
    });

    if (hasError) {
      setError(errorMessage);
      return;
    }

    // Obliczamy aktualne wskaźniki przed zapisaniem
    const wskaznikiDoZapisu = {
      czasOpiekiBezEdukacji: czasOpiekiBezEdukacji,
      czasAktywnejOpieki: czasAktywnejOpieki,
      czasSnu: czasSnu,
    };

    // Zapisujemy dane do store'a
    if (aktualneDzieckoId && formData.dzieci) {
      const zaktualizowaneDzieci = formData.dzieci.map((dziecko) => {
        if (dziecko.id === aktualneDzieckoId) {
          return {
            ...dziecko,
            cyklOpieki,
            // Zapisz wskaźniki zarówno jako obiekt JSON jak i do poszczególnych pól
            wskaznikiCzasuOpieki: wskaznikiDoZapisu,
            // Zapisz wskaźniki do dedykowanych pól (będą dostępne w bazie danych)
            procentCzasuOpieki: Math.round(
              (czasOpiekiBezEdukacji + czasSnu) / 2
            ), // Średnia wartość jako procentCzasuOpieki
            procentCzasuOpiekiBezEdukacji: czasOpiekiBezEdukacji,
            procentCzasuAktywnejOpieki: czasAktywnejOpieki,
            procentCzasuSnu: czasSnu,
            tabeleCzasuOpieki, // Zachowanie tabeli dla referencji
          } as DzieckoRozszerzone;
        }
        return dziecko;
      }); // Aktualizujemy dane dziecka
      updateFormData({
        dzieci: zaktualizowaneDzieci,
      }); // Przewijamy stronę do góry przed przejściem do następnej strony
      scrollToTop();
      const aktualneDzieckoIndex = formData.aktualneDzieckoIndex || 0;

      // Zawsze przechodzimy do strony opieki w okresach specjalnych dla tego dziecka
      const operationId = Date.now().toString();
      trackedLog(operationId, "Navigating to opieka-wakacje");
      router.push("/opieka-wakacje");
    }
  };

  // Funkcja do obsługi powrotu do poprzedniego kroku
  const handleBack = () => {
    // Zapisujemy aktualne wskaźniki
    const wskaznikiDoZapisu = {
      czasOpiekiBezEdukacji: czasOpiekiBezEdukacji,
      czasAktywnejOpieki: czasAktywnejOpieki,
      czasSnu: czasSnu,
    };

    // Zapisujemy aktualne dane dziecka
    if (aktualneDzieckoId && formData.dzieci) {
      const zaktualizowaneDzieci = formData.dzieci.map((dziecko) => {
        if (dziecko.id === aktualneDzieckoId) {
          return {
            ...dziecko,
            cyklOpieki,
            // Zapisz wskaźniki zarówno jako obiekt JSON jak i do poszczególnych pól
            wskaznikiCzasuOpieki: wskaznikiDoZapisu,
            // Zapisz wskaźniki do dedykowanych pól (będą dostępne w bazie danych)
            procentCzasuOpieki: Math.round(
              (czasOpiekiBezEdukacji + czasSnu) / 2
            ), // Średnia wartość jako procentCzasuOpieki
            procentCzasuOpiekiBezEdukacji: czasOpiekiBezEdukacji,
            procentCzasuAktywnejOpieki: czasAktywnejOpieki,
            procentCzasuSnu: czasSnu,
            tabeleCzasuOpieki,
          } as DzieckoRozszerzone;
        }
        return dziecko;
      });
      updateFormData({
        dzieci: zaktualizowaneDzieci,
      });
    } // Przewijamy stronę do góry przed przejściem do poprzedniej strony
    scrollToTop();

    // Wracamy do strony dzieci dla tego samego dziecka
    router.push("/dzieci");
  };

  // Funkcja do przełączania między tygodniami
  const handleChangeTydzien = (tydzien: number) => {
    setAktywnyTydzien(tydzien);
  };

  // Pomocnicza funkcja do konwersji kodu dnia na pełną nazwę
  const getDzienNazwa = (dzien: string) => {
    const nazwy: { [key: string]: string } = {
      pn: "Poniedziałek",
      wt: "Wtorek",
      sr: "Środa",
      cz: "Czwartek",
      pt: "Piątek",
      sb: "Sobota",
      nd: "Niedziela",
    };
    return nazwy[dzien] || dzien;
  };

  // Jeśli nie ma dzieci z modelem "inny", przekieruj od razu do kosztów utrzymania
  useEffect(() => {
    if (
      dzieciZModelemInnym.length === 0 &&
      formData.dzieci &&
      formData.dzieci.length > 0
    ) {
      router.push("/koszty-utrzymania");
    }
  }, [dzieciZModelemInnym.length, formData.dzieci, router]);

  // Tabela dni tygodnia - zaczynamy od piątku zgodnie z wytycznymi klienta
  const dniTygodnia = ["pt", "sb", "nd", "pn", "wt", "śr", "cz"];
  const dniTygodniaPelne = [
    "Piątek",
    "Sobota",
    "Niedziela",
    "Poniedziałek",
    "Wtorek",
    "Środa",
    "Czwartek",
  ];

  // Kategorie czasu
  const kategorieTabeli = [
    {
      id: "poranek",
      nazwa: <span>Poranek</span>,
      tooltip:
        "Godziny, w których rodzic ma opiekę nad dzieckiem rano (np. od momentu wstania do wyjścia z domu).",
    },
    {
      id: "placowkaEdukacyjna",
      nazwa: (
        <span>
          Placówka
          <br />
          edukacyjna
        </span>
      ),
      tooltip:
        "Czas, który dziecko spędza w placówce edukacyjnej (np. szkoła, przedszkole, żłobek).",
    },
    {
      id: "czasPoEdukacji",
      nazwa: (
        <span>
          Czas po
          <br />
          edukacji
        </span>
      ),
      tooltip:
        "Czas spędzany z dzieckiem po powrocie z placówki edukacyjnej (np. zabawa, zajęcia w domu).",
    },
    {
      id: "senURodzica",
      nazwa: (
        <span>
          Sen u<br />
          Ciebie
        </span>
      ),
      tooltip:
        "Czas, który dziecko spędza na spaniu, gdy jest pod Twoją opieką.",
    },
    {
      id: "senUDrugiegoRodzica",
      nazwa: (
        <span>
          Sen u<br />
          drugiego
          <br />
          rodzica
        </span>
      ),
      tooltip:
        "Szacunkowe godziny, które dziecko spędza na spaniu, gdy jest pod opieką drugiego rodzica.",
    },
  ];

  // Renderowanie tabeli tygodnia
  const renderTabelaTygodnia = (tydzien: number) => (
    <div key={`tydzien-${tydzien}`} className="mb-8">
      <h3 className="text-lg font-semibold mb-3">
        Tydzień {tydzien} {cyklOpieki === "custom" ? "(przykładowy)" : ""}
      </h3>
      <div className="overflow-x-auto relative">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left border sticky left-0 z-10 bg-gray-50">
                Czas
              </th>
              {dniTygodnia.map((dzien, index) => (
                <th key={dzien} className="p-2 text-center border">
                  <span className="hidden sm:inline">
                    {dniTygodniaPelne[index]}
                  </span>
                  <span className="sm:hidden">{dzien.toUpperCase()}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kategorieTabeli.map((kategoria) => (
              <tr key={kategoria.id} className="border-b">
                <td className="p-2 border sticky left-0 bg-white z-10">
                  <div className="flex items-center gap-1">
                    {kategoria.nazwa}
                    <InfoTooltip content={kategoria.tooltip} />
                  </div>
                </td>
                {dniTygodnia.map((dzien) => (
                  <td key={dzien} className="p-2 text-center border">
                    <select
                      value={
                        tabeleCzasuOpieki[tydzien]?.[dzien]?.[
                          kategoria.id as keyof DzienCzasuOpieki
                        ] || "0"
                      }
                      onChange={(e) =>
                        updateTabelaCzasu(
                          tydzien,
                          dzien,
                          kategoria.id,
                          parseInt(e.target.value)
                        )
                      }
                      className="w-16 h-10 text-center mx-auto border rounded-md czas-opieki-input min-w-[60px] focus:ring-2 focus:ring-blue-500"
                    >
                      {Array.from({ length: 13 }, (_, i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (!aktualneDziecko) {
    return (
      <main className="flex justify-center p-3">
        <Card className="w-full max-w-lg shadow-lg border-sky-100">
          <CardContent className="pt-2">
            <div className="text-center pb-4">
              <Logo className="inline-block" size="large" />
            </div>
            <FormProgress currentStep={5} totalSteps={12} />
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Czas opieki</h1>
                <InfoTooltip
                  content={
                    <div className="space-y-2 text-sm">
                      <p>
                        Dane o czasie opieki są niezbędne do dokładnego
                        obliczenia alimentów.
                      </p>
                    </div>
                  }
                />
              </div>
              <p>Trwa ładowanie danych...</p>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Liczba tygodni do wyświetlenia
  const liczbaTygodni = getLiczbaTygodni(cyklOpieki);

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <Logo size="large" />
          <FormProgress currentStep={5} totalSteps={12} />
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Tabela czasu opieki</h1>
            </div>{" "}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium">
                Wypełniasz tabelę czasu opieki dla Dziecka {aktualneDziecko.id}{" "}
                (
                {aktualneDzieckoId &&
                  formData.dzieci &&
                  formData.dzieci.findIndex((d) => d.id === aktualneDzieckoId) +
                    1}
                /{formData.dzieci?.length || 0}) - {aktualneDziecko.wiek} lat
              </p>
            </div>
            <div>
              <p>Zanim zaczniesz: kilka słów od nas</p>
              <p>
                Ta część może zająć chwilę – ale każda minuta ma znaczenie. Nie
                tylko dostarczasz danych do raportu. Masz też okazję uważnie
                przyjrzeć się swojej codzienności – temu, ile realnie czasu
                spędzasz z dzieckiem i jak wygląda Wasz rytm tygodnia.
              </p>

              <p className="text-sm">
                Wypełnienie tabeli zajmie około 10-15 minut. Pamiętaj, że zawsze
                możesz wrócić do poprzednich sekcji i skorygować swoje
                odpowiedzi.
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm font-semibold">
                To często moment refleksji – i bardzo często przynosi ważne
                spostrzeżenia.
              </p>
              <p className="text-sm font-semibold">
                Uwaga techniczna – jak wypełniać
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>
                  Wpisujesz tylko godziny, kiedy:{" "}
                  <ol className="list-decimal list-inside pl-4 space-y-1">
                    <li>dziecko jest z Tobą</li>
                    <li>przebywa w placówce edukacyjnej</li>
                    <li>śpi u Ciebie lub u drugiego rodzica</li>
                  </ol>
                </li>
                <li>
                  Cały czas snu przypisujemy do dnia, w którym dziecko zasnęło.
                </li>
                <li>
                  Jeśli dziecko uczęszcza do żłobka, przedszkola lub szkoły –
                  wpisz liczbę godzin spędzonych w placówce.
                </li>
                <li>
                  Pozostałe godziny formularz automatycznie przypisze drugiemu
                  rodzicowi – na podstawie tego, co Ty wpiszesz.
                </li>
              </ul>
            </div>
            <div>
              <Label htmlFor="care-cycle">🔄 Cykl opieki</Label>
              <p>
                Wskaż, w jakim rytmie powtarza się Wasz podział opieki nad
                dzieckiem. To ważne, by system mógł dokładnie obliczyć, jak
                wygląda proporcja czasu spędzanego z każdym z rodziców.
              </p>
              <select
                id="care-cycle"
                value={cyklOpieki}
                onChange={(e) => handleCyklOpiekiChange(e.target.value)}
                className="mt-1 w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">Co tydzień</option>
                <option value="2">Co 2 tygodnie</option>
                <option value="4">Co 4 tygodnie (np. układ miesięczny)</option>
                <option value="custom">
                  Brak stałego schematu – uśrednimy dane do 4-tygodniowego cyklu
                </option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Jeśli wybierzesz &quot;Brak stałego schematu&quot;, podaj dane
                dla przykładowych 4 tygodni, żeby ustandaryzować analizę.
              </p>
            </div>
            {/* Wyświetlanie przycisków wyboru tygodnia dla wielotygodniowych cykli */}
            {liczbaTygodni > 1 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {Array.from({ length: liczbaTygodni }, (_, i) => i + 1).map(
                  (tydzien) => (
                    <Button
                      key={tydzien}
                      variant={
                        aktywnyTydzien === tydzien ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handleChangeTydzien(tydzien)}
                    >
                      Tydzień {tydzien}
                    </Button>
                  )
                )}
              </div>
            )}
            {/* Renderowanie odpowiednich tabel tygodni */}
            {cyklOpieki === "1"
              ? // Dla cyklu jednotygodniowego pokazujemy tylko jedną tabelę
                renderTabelaTygodnia(1)
              : // Dla pozostałych cykli pokazujemy tabele dla aktywnego tygodnia
                renderTabelaTygodnia(aktywnyTydzien)}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {/* Podsumowanie podziału czasu opieki */}
            <div className="mt-8 p-4 rounded-lg bg-blue-50">
              <h3 className="text-lg font-semibold mb-3">
                Podsumowanie podziału standardowego czasu opieki nad dzieckiem
              </h3>
              <p className="text-sm mb-4">
                Poniżej przedstawiamy, jak – na podstawie wypełnionych danych –
                kształtuje się udział Twojego czasu opiekuńczego w analizowanym
                okresie.
              </p>

              {/* Wskaźnik 1 - Łączny czas opieki */}
              <div className="mb-4">
                <h4 className="font-medium">
                  🔹 1. Łączny czas opieki (bez placówki edukacyjnej):
                </h4>
                <div className="flex items-center mt-1">
                  <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden flex-1 mr-2">
                    <div
                      className="absolute top-0 left-0 h-full bg-sky-600 transition-all duration-500"
                      style={{ width: `${czasOpiekiBezEdukacji}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {czasOpiekiBezEdukacji}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Tyle wynosi Twój udział w czasie, kiedy dziecko nie przebywa w
                  placówce edukacyjnej.
                  <InfoTooltip content="Obejmuje wszystkie godziny czuwania – bez względu na to, czy dziecko aktywnie korzysta z Twojej obecności (np. zabawa, opieka), czy np. ogląda bajkę obok Ciebie." />
                </p>
              </div>

              {/* Wskaźnik 2 - Aktywna opieka */}
              <div className="mb-4">
                <h4 className="font-medium">
                  🔹 2. Czas aktywnej opieki (bez placówki edukacyjnej i bez
                  snu):
                </h4>
                <div className="flex items-center mt-1">
                  <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden flex-1 mr-2">
                    <div
                      className="absolute top-0 left-0 h-full bg-sky-600 transition-all duration-500"
                      style={{ width: `${czasAktywnejOpieki}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {czasAktywnejOpieki}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Tyle wynosi Twój udział w czasie, kiedy dziecko nie śpi i nie
                  przebywa w placówce edukacyjnej.
                  <InfoTooltip content="To ten czas, w którym najczęściej trzeba faktycznie zaopiekować się dzieckiem – zorganizować dzień, ugotować, zawieźć, porozmawiać." />
                </p>
              </div>

              {/* Wskaźnik 3 - Sen */}
              <div>
                <h4 className="font-medium">
                  🔹 3. Czas nocnego snu pod Twoją opieką (procentowo):
                </h4>
                <div className="flex items-center mt-1">
                  <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden flex-1 mr-2">
                    <div
                      className="absolute top-0 left-0 h-full bg-sky-600 transition-all duration-500"
                      style={{ width: `${czasSnu}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {czasSnu}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Tyle nocy dziecko spędza z Tobą (sen przypisujemy do dnia, w
                  którym dziecko zasnęło).
                  <InfoTooltip content="To informacja o tym, gdzie dziecko faktycznie nocuje – często istotna w sprawach sądowych." />
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={handleBack}>
                Wstecz
              </Button>{" "}
              <Button className="flex-1" onClick={handleNext}>
                Dalej
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <style jsx global>
        {hideSpinnersStyle}
      </style>
    </main>
  );
}
