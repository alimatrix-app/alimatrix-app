"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useFormStore } from "@/lib/store/form-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import {
  safeToSubmit,
  recordSubmission,
  generateCSRFToken,
  storeCSRFToken,
} from "@/lib/client-security";
import {
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";
import { KosztyDziecka } from "./typings";
import { kosztyDzieckaSchema } from "@/lib/schemas/koszty-utrzymania-schema";

export default function KosztyUtrzymania() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // CSRF Security Enhancement
  const csrfInitialized = useRef(false);
  useEffect(() => {
    if (!csrfInitialized.current) {
      const token = generateCSRFToken();
      storeCSRFToken(token);
      updateFormData({
        __meta: {
          csrfToken: token,
          lastUpdated: Date.now(),
          formVersion: "1.2.0",
        },
      });
      csrfInitialized.current = true;
    }
  }, [updateFormData]);

  // Funkcja scrollToTop zaimplementowana bezpośrednio w komponencie
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []); // Stan dla aktualnego dziecka i danych kosztów
  const [aktualneDzieckoIndex, setAktualneDzieckoIndex] = useState<number>(
    formData.aktualneDzieckoIndex || 0
  );
  const [zakonczoneIndeksyDzieci, setZakonczoneIndeksyDzieci] = useState<
    number[]
  >(formData.zakonczoneIndeksyDzieci || []);
  const [kosztyDzieci, setKosztyDzieci] = useState<KosztyDziecka[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Funkcja do obliczania łącznej kwoty utrzymania dziecka
  const obliczLacznaKwote = (koszty: KosztyDziecka): number => {
    let suma = 0;

    // Dodaj kwotę alimentów
    if (typeof koszty.kwotaAlimentow === "number") {
      suma += koszty.kwotaAlimentow;
    }

    // Dodaj twoje miesięczne wydatki
    if (typeof koszty.twojeMiesieczneWydatki === "number") {
      suma += koszty.twojeMiesieczneWydatki;
    }

    // Dodaj wydatki drugiego rodzica (jeśli znane)
    if (typeof koszty.wydatkiDrugiegoRodzica === "number") {
      suma += koszty.wydatkiDrugiegoRodzica;
    }

    // Dodaj kwoty z innych źródeł
    if (
      koszty.inneZrodlaUtrzymania.rentaRodzinna &&
      typeof koszty.inneZrodlaUtrzymania.rentaRodzinnaKwota === "number"
    ) {
      suma += koszty.inneZrodlaUtrzymania.rentaRodzinnaKwota;
    }

    if (
      koszty.inneZrodlaUtrzymania.swiadczeniePielegnacyjne &&
      typeof koszty.inneZrodlaUtrzymania.swiadczeniePielegnacyjneKwota ===
        "number"
    ) {
      suma += koszty.inneZrodlaUtrzymania.swiadczeniePielegnacyjneKwota;
    }

    if (
      koszty.inneZrodlaUtrzymania.inne &&
      typeof koszty.inneZrodlaUtrzymania.inneKwota === "number"
    ) {
      suma += koszty.inneZrodlaUtrzymania.inneKwota;
    }

    return suma;
  };

  // Inicjalizacja danych kosztów na podstawie dzieci z formData
  useEffect(() => {
    if (
      formData.dzieci &&
      formData.dzieci.length > 0 &&
      kosztyDzieci.length === 0
    ) {
      const noweKoszty: KosztyDziecka[] = formData.dzieci.map((dziecko) => ({
        id: dziecko.id,
        kwotaAlimentow: "",
        twojeMiesieczneWydatki: "",
        wydatkiDrugiegoRodzica: "",
        kosztyUznanePrzezSad: "",
        inneZrodlaUtrzymania: {
          rentaRodzinna: false,
          rentaRodzinnaKwota: "",
          swiadczeniePielegnacyjne: false,
          swiadczeniePielegnacyjneKwota: "",
          inne: false,
          inneOpis: "",
          inneKwota: "",
          brakDodatkowychZrodel: true,
        },
      }));
      setKosztyDzieci(noweKoszty);
    }
  }, [formData.dzieci, kosztyDzieci.length]);

  // Znajdź aktualne dziecko na podstawie ID ustawionego dla tabeli czasu
  useEffect(() => {
    if (
      formData.aktualneDzieckoWTabeliCzasu &&
      formData.dzieci &&
      kosztyDzieci.length > 0
    ) {
      // Znajdź indeks dziecka o danym ID w tablicy dzieci
      const index = formData.dzieci.findIndex(
        (d) => d.id === formData.aktualneDzieckoWTabeliCzasu
      );
      if (index !== -1) {
        setAktualneDzieckoIndex(index);
      }
    }
  }, [
    formData.aktualneDzieckoWTabeliCzasu,
    formData.dzieci,
    kosztyDzieci.length,
  ]);

  // Funkcja do aktualizacji kosztów dla aktualnego dziecka
  const updateKosztyDziecka = (data: Partial<KosztyDziecka>) => {
    setKosztyDzieci((prev) => {
      const updated = [...prev];
      updated[aktualneDzieckoIndex] = {
        ...updated[aktualneDzieckoIndex],
        ...data,
      };
      return updated;
    });
  };

  // Funkcja do aktualizacji innych źródeł utrzymania
  const updateInneZrodla = (
    data: Partial<KosztyDziecka["inneZrodlaUtrzymania"]>
  ) => {
    setKosztyDzieci((prev) => {
      const updated = [...prev];
      updated[aktualneDzieckoIndex] = {
        ...updated[aktualneDzieckoIndex],
        inneZrodlaUtrzymania: {
          ...updated[aktualneDzieckoIndex].inneZrodlaUtrzymania,
          ...data,
        },
      };
      return updated;
    });
  };

  // Walidacja formularza przy użyciu schematu Zod
  const validateForm = useCallback((dziecko: KosztyDziecka) => {
    try {
      kosztyDzieckaSchema.parse(dziecko);
      setError(null);
      setFieldErrors({});
      return true;
    } catch (err: any) {
      // Obsługa błędów walidacji Zod
      if (err.errors) {
        const errorMessages: Record<string, string> = {};
        let generalError: string | null = null;

        err.errors.forEach((e: any) => {
          const path = e.path.join(".");
          errorMessages[path] = e.message;

          // Ustaw pierwszy błąd jako ogólny komunikat
          if (!generalError) {
            generalError = e.message;
          }
        });

        setFieldErrors(errorMessages);
        if (generalError) {
          setError(generalError);
        }
      } else {
        setError("Wystąpiły błędy formularza. Sprawdź poprawność danych.");
      }
      return false;
    }
  }, []);

  // Obsługa przejścia do następnego dziecka lub kroku
  const handleNext = useCallback(async () => {
    // Zapobieganie wielokrotnym kliknięciom
    if (isSubmitting || !safeToSubmit()) {
      trackedLog(
        "user-action",
        "Form submission prevented: Already submitting or too soon after last submission"
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    const operationId = generateOperationId();
    trackedLog(operationId, "Starting koszty utrzymania form submission");

    try {
      const aktualneDziecko = kosztyDzieci[aktualneDzieckoIndex];

      // Walidacja danych formularza
      if (!validateForm(aktualneDziecko)) {
        setIsSubmitting(false);
        return;
      }

      // Przygotowujemy dane kosztów do zapisania w store
      // Konwertujemy typ KosztyDziecka[] na format wymagany przez formStore
      const kosztyDoZapisu = kosztyDzieci.map((k) => ({
        id: k.id,
        kwotaAlimentow:
          typeof k.kwotaAlimentow === "number" ? k.kwotaAlimentow : 0,
        twojeMiesieczneWydatki:
          typeof k.twojeMiesieczneWydatki === "number"
            ? k.twojeMiesieczneWydatki
            : 0,
        wydatkiDrugiegoRodzica:
          typeof k.wydatkiDrugiegoRodzica === "number"
            ? k.wydatkiDrugiegoRodzica
            : undefined,
        kosztyUznanePrzezSad:
          typeof k.kosztyUznanePrzezSad === "number"
            ? k.kosztyUznanePrzezSad
            : undefined,
        inneZrodlaUtrzymania: {
          rentaRodzinna: k.inneZrodlaUtrzymania.rentaRodzinna,
          rentaRodzinnaKwota:
            k.inneZrodlaUtrzymania.rentaRodzinna &&
            typeof k.inneZrodlaUtrzymania.rentaRodzinnaKwota === "number"
              ? k.inneZrodlaUtrzymania.rentaRodzinnaKwota
              : undefined,
          swiadczeniePielegnacyjne:
            k.inneZrodlaUtrzymania.swiadczeniePielegnacyjne,
          swiadczeniePielegnacyjneKwota:
            k.inneZrodlaUtrzymania.swiadczeniePielegnacyjne &&
            typeof k.inneZrodlaUtrzymania.swiadczeniePielegnacyjneKwota ===
              "number"
              ? k.inneZrodlaUtrzymania.swiadczeniePielegnacyjneKwota
              : undefined,
          inne: k.inneZrodlaUtrzymania.inne,
          inneOpis: k.inneZrodlaUtrzymania.inne
            ? k.inneZrodlaUtrzymania.inneOpis
            : undefined,
          inneKwota:
            k.inneZrodlaUtrzymania.inne &&
            typeof k.inneZrodlaUtrzymania.inneKwota === "number"
              ? k.inneZrodlaUtrzymania.inneKwota
              : undefined,
          brakDodatkowychZrodel: k.inneZrodlaUtrzymania.brakDodatkowychZrodel,
        },
      })); // Zapisz dane z mechanizmem ponownych prób
      let dataSaved = false;
      await retryOperation(
        async () => {
          await updateFormData({
            kosztyDzieci: kosztyDoZapisu,
            __meta: {
              lastUpdated: Date.now(),
              formVersion: "1.2.0",
            },
          });
          dataSaved = true;
          return true;
        },
        {
          maxAttempts: 3,
          delayMs: 300,
          operationName: "Update form data - koszty utrzymania",
          operationId,
        }
      );

      // Zapisujemy informację o submisji formularza dla celów analizy
      recordSubmission(); // Pobierz aktualny indeks dziecka i zakończone indeksy dzieci
      const zakonczoneIndeksyDzieci = formData.zakonczoneIndeksyDzieci || []; // Pobieramy aktualną liczbę dzieci
      const liczbaDzieci = formData.dzieci?.length || 0;

      // Debug logging - before changes

      // Log informacji o stanie formularza został usunięty przed deploymentem

      // Sprawdzamy, czy zapisanie się powiodło
      if (dataSaved) {
        // Dodajemy aktualne dziecko do zakończonych
        let noweZakonczoneIndeksyDzieci = [...zakonczoneIndeksyDzieci];
        if (!noweZakonczoneIndeksyDzieci.includes(aktualneDzieckoIndex)) {
          noweZakonczoneIndeksyDzieci.push(aktualneDzieckoIndex);
        }

        // Sprawdzamy, czy wszystkie dzieci zostały już wypełnione
        const czyWszystkieDzieciZakonczone =
          noweZakonczoneIndeksyDzieci.length >= liczbaDzieci;
        if (czyWszystkieDzieciZakonczone) {
          // Wszystkie dzieci są już zakończone, przechodzimy do następnego kroku

          // Zapisujemy aktualizację
          await updateFormData({
            zakonczoneIndeksyDzieci: noweZakonczoneIndeksyDzieci,
          });

          // Przewijamy stronę do góry przed przejściem do następnego kroku
          scrollToTop();

          // Dodajemy małe opóźnienie dla lepszego UX
          setTimeout(() => {
            trackedLog(
              operationId,
              "All children completed, navigating to dochody-i-koszty"
            );
            router.push("/dochody-i-koszty");

            // Zmniejszamy szansę na back button lub podwójną submisję
            setTimeout(() => {
              setIsSubmitting(false);
            }, 500);
          }, 100);
        } else {
          // Określamy następne dziecko do wypełnienia
          // Szukamy pierwszego dziecka, które nie zostało jeszcze zakończone
          let nextIndex = 0;
          for (let i = 0; i < liczbaDzieci; i++) {
            if (!noweZakonczoneIndeksyDzieci.includes(i)) {
              nextIndex = i;
              break;
            }
          } // Aktualizujemy formData z nowym indeksem i listą zakończonych dzieci
          await updateFormData({
            aktualneDzieckoIndex: nextIndex,
            aktualneDzieckoWTabeliCzasu: formData.dzieci?.[nextIndex]?.id,
            zakonczoneIndeksyDzieci: noweZakonczoneIndeksyDzieci,
          });

          // Przewijamy stronę do góry przed przejściem do następnej strony/dziecka
          scrollToTop(); // Dodajemy małe opóźnienie dla lepszego UX
          setTimeout(() => {
            trackedLog(operationId, "Navigating back to dzieci for next child");
            router.push("/dzieci");

            // Zmniejszamy szansę na back button lub podwójną submisję
            setTimeout(() => {
              setIsSubmitting(false);
            }, 500);
          }, 100);
        }
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      trackedLog(operationId, "Error saving koszty utrzymania data");
      setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    kosztyDzieci,
    aktualneDzieckoIndex,
    formData.dzieci,
    formData.zakonczoneIndeksyDzieci,
    zakonczoneIndeksyDzieci,
    updateFormData,
    router,
    scrollToTop,
    validateForm,
  ]);

  // Obsługa powrotu do poprzedniego dziecka lub kroku
  const handleBack = useCallback(async () => {
    // Zapobieganie wielokrotnym kliknięciom
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const operationId = generateOperationId();
    trackedLog(operationId, "Back navigation from koszty utrzymania");

    try {
      // Zapisz bieżące dane przed cofnięciem
      const kosztyDoZapisu = kosztyDzieci.map((k) => ({
        id: k.id,
        kwotaAlimentow:
          typeof k.kwotaAlimentow === "number" ? k.kwotaAlimentow : 0,
        twojeMiesieczneWydatki:
          typeof k.twojeMiesieczneWydatki === "number"
            ? k.twojeMiesieczneWydatki
            : 0,
        wydatkiDrugiegoRodzica:
          typeof k.wydatkiDrugiegoRodzica === "number"
            ? k.wydatkiDrugiegoRodzica
            : undefined,
        kosztyUznanePrzezSad:
          typeof k.kosztyUznanePrzezSad === "number"
            ? k.kosztyUznanePrzezSad
            : undefined,
        inneZrodlaUtrzymania: {
          rentaRodzinna: k.inneZrodlaUtrzymania.rentaRodzinna,
          rentaRodzinnaKwota:
            k.inneZrodlaUtrzymania.rentaRodzinna &&
            typeof k.inneZrodlaUtrzymania.rentaRodzinnaKwota === "number"
              ? k.inneZrodlaUtrzymania.rentaRodzinnaKwota
              : undefined,
          swiadczeniePielegnacyjne:
            k.inneZrodlaUtrzymania.swiadczeniePielegnacyjne,
          swiadczeniePielegnacyjneKwota:
            k.inneZrodlaUtrzymania.swiadczeniePielegnacyjne &&
            typeof k.inneZrodlaUtrzymania.swiadczeniePielegnacyjneKwota ===
              "number"
              ? k.inneZrodlaUtrzymania.swiadczeniePielegnacyjneKwota
              : undefined,
          inne: k.inneZrodlaUtrzymania.inne,
          inneOpis: k.inneZrodlaUtrzymania.inne
            ? k.inneZrodlaUtrzymania.inneOpis
            : undefined,
          inneKwota:
            k.inneZrodlaUtrzymania.inne &&
            typeof k.inneZrodlaUtrzymania.inneKwota === "number"
              ? k.inneZrodlaUtrzymania.inneKwota
              : undefined,
          brakDodatkowychZrodel: k.inneZrodlaUtrzymania.brakDodatkowychZrodel,
        },
      }));
      await updateFormData({
        kosztyDzieci: kosztyDoZapisu,
        __meta: {
          lastUpdated: Date.now(),
          formVersion: "1.2.0",
        },
      });

      // Aktualnie przetwarzane dziecko
      const aktualneDziecko = formData.dzieci?.[aktualneDzieckoIndex];

      // Sprawdzamy czy aktualne dziecko ma model opieki "inny"
      if (aktualneDziecko?.modelOpieki === "inny") {
        // Przewijamy stronę do góry przed przejściem do poprzedniej strony
        scrollToTop();

        // Dodajemy małe opóźnienie dla lepszego UX
        setTimeout(() => {
          trackedLog(operationId, "Navigating back to opieka-wakacje");
          // Jeśli tak, wracamy do strony opieki w okresach specjalnych dla tego dziecka
          router.push("/opieka-wakacje");
          setIsSubmitting(false);
        }, 100);
      } else if (aktualneDzieckoIndex > 0) {
        // Jeśli nie, a istnieje poprzednie dziecko, cofamy się do niego
        const poprzednieDziecko = formData.dzieci?.[aktualneDzieckoIndex - 1];
        if (poprzednieDziecko) {
          // Ustawiamy poprzednie dziecko jako aktualne
          await updateFormData({
            aktualneDzieckoWTabeliCzasu: poprzednieDziecko.id,
          });

          // Sprawdzamy model opieki poprzedniego dziecka
          if (poprzednieDziecko.modelOpieki === "inny") {
            // Przewijamy stronę do góry przed przejściem do poprzedniej strony
            scrollToTop();

            // Dodajemy małe opóźnienie dla lepszego UX
            setTimeout(() => {
              trackedLog(operationId, "Navigating back to czas-opieki");
              // Jeśli poprzednie dziecko ma model "inny", wracamy do czasu opieki
              router.push("/czas-opieki");
              setIsSubmitting(false);
            }, 100);
          } else {
            // W przeciwnym razie zostajemy na stronie kosztów, ale zmieniamy indeks
            setAktualneDzieckoIndex(aktualneDzieckoIndex - 1);
            // Przewijamy stronę do góry
            scrollToTop();
            setIsSubmitting(false);
          }
        } else {
          setIsSubmitting(false);
        }
      } else {
        // Jeśli to pierwsze dziecko i nie ma modelu "inny", wracamy do strony dzieci
        // Przewijamy stronę do góry przed przejściem do poprzedniej strony
        scrollToTop();

        // Dodajemy małe opóźnienie dla lepszego UX
        setTimeout(() => {
          trackedLog(operationId, "Navigating back to dzieci");
          router.push("/dzieci");
          setIsSubmitting(false);
        }, 100);
      }
    } catch (error) {
      trackedLog(operationId, "Error during back navigation");
      setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    kosztyDzieci,
    aktualneDzieckoIndex,
    formData.dzieci,
    updateFormData,
    router,
    scrollToTop,
  ]);

  // Pobierz aktualne dziecko z form store
  const aktualneDziecko = formData.dzieci?.[aktualneDzieckoIndex];
  const aktualneKoszty = kosztyDzieci[aktualneDzieckoIndex];

  if (!aktualneDziecko || !aktualneKoszty) {
    return (
      <main className="flex justify-center p-3">
        <Card className="w-full max-w-lg shadow-lg border-sky-100">
          <CardContent className="pt-2">
            <div className="text-center pb-4">
              <Logo className="inline-block" size="large" />
            </div>
            <FormProgress currentStep={7} totalSteps={12} />
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  Koszty utrzymania dziecka
                </h1>
                <InfoTooltip
                  content={
                    <div className="space-y-2 text-sm">
                      <p>
                        Informacje o kosztach utrzymania dziecka są kluczowe do
                        ustalenia odpowiedniej wysokości alimentów.
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

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <Logo size="large" />
          <FormProgress currentStep={7} totalSteps={12} />
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Koszty utrzymania dziecka</h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      Informacje o kosztach utrzymania dziecka są kluczowe do
                      ustalenia odpowiedniej wysokości alimentów.
                    </p>
                  </div>
                }
              />
            </div>{" "}
            <div className="bg-blue-50 p-4 rounded-lg">
              {" "}
              <div className="flex justify-between items-center">
                <p className="font-medium">
                  Wypełniasz dane o kosztach dla Dziecka {aktualneDziecko.id} (
                  {aktualneDzieckoIndex + 1}/{formData.dzieci?.length || 0}) -{" "}
                  {aktualneDziecko.wiek} lat
                </p>
                <div className="flex gap-2">
                  {Array.from({ length: formData.dzieci?.length || 0 }).map(
                    (_, idx) => (
                      <div
                        key={idx}
                        className={`w-3 h-3 rounded-full ${
                          zakonczoneIndeksyDzieci.includes(idx)
                            ? "bg-green-500"
                            : idx === aktualneDzieckoIndex
                            ? "bg-blue-500"
                            : "bg-gray-200"
                        }`}
                        title={`Dziecko ${idx + 1}`}
                      />
                    )
                  )}
                </div>
              </div>
              <p className="text-sm mt-1">
                Podaj rzeczywiste koszty, które ponosisz na utrzymanie dziecka.
              </p>
            </div>
            <p className="text-gray-700">
              Nie po to, by je oceniać. Pytamy, by lepiej zrozumieć rzeczywiste
              potrzeby dzieci w różnych sytuacjach życiowych – i dać Ci dane,
              które możesz wykorzystać w rozmowach, negocjacjach lub przed
              sądem.
            </p>
            <p className="text-gray-700">
              📌 Jeśli masz wydatki roczne (np. wakacje, sprzęt sportowy),
              podziel je przez 12 i podaj uśrednioną miesięczną kwotę.
            </p>{" "}
            <div>
              <Label htmlFor="kwota-alimentow">
                Kwota alimentów <span className="text-red-500">*</span>
              </Label>
              <Input
                id="kwota-alimentow"
                type="number"
                min="0"
                step="0.01"
                value={aktualneKoszty.kwotaAlimentow}
                onChange={(e) => {
                  updateKosztyDziecka({
                    kwotaAlimentow: e.target.value
                      ? parseFloat(e.target.value)
                      : "",
                  });
                  // Reset errors when typing
                  if (fieldErrors["kwotaAlimentow"]) {
                    setFieldErrors((prev) => {
                      const updated = { ...prev };
                      delete updated["kwotaAlimentow"];
                      return updated;
                    });
                  }
                  if (error) setError(null);
                }}
                className={`mt-1 ${
                  fieldErrors["kwotaAlimentow"] ? "border-red-500" : ""
                }`}
                placeholder="0"
              />
              {fieldErrors["kwotaAlimentow"] && (
                <p className="text-red-500 text-xs mt-1">
                  {fieldErrors["kwotaAlimentow"]}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Jaka kwota została ustalona jako alimenty na to dziecko (przez
                sąd lub w porozumieniu)?
              </p>
            </div>{" "}
            <div>
              <Label htmlFor="twoje-wydatki">
                Twoje miesięczne wydatki na dziecko{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="twoje-wydatki"
                type="number"
                min="0"
                step="0.01"
                value={aktualneKoszty.twojeMiesieczneWydatki}
                onChange={(e) => {
                  updateKosztyDziecka({
                    twojeMiesieczneWydatki: e.target.value
                      ? parseFloat(e.target.value)
                      : "",
                  });
                  // Reset errors when typing
                  if (fieldErrors["twojeMiesieczneWydatki"]) {
                    setFieldErrors((prev) => {
                      const updated = { ...prev };
                      delete updated["twojeMiesieczneWydatki"];
                      return updated;
                    });
                  }
                  if (error) setError(null);
                }}
                className={`mt-1 ${
                  fieldErrors["twojeMiesieczneWydatki"] ? "border-red-500" : ""
                }`}
                placeholder="0"
              />
              {fieldErrors["twojeMiesieczneWydatki"] && (
                <p className="text-red-500 text-xs mt-1">
                  {fieldErrors["twojeMiesieczneWydatki"]}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Jaką średnią miesięczną kwotę przeznaczasz na potrzeby dziecka?
              </p>
            </div>{" "}
            <div>
              <Label htmlFor="wydatki-drugiego">
                Wydatki drugiego rodzica (jeśli znane)
              </Label>
              <Input
                id="wydatki-drugiego"
                type="number"
                min="0"
                step="0.01"
                value={aktualneKoszty.wydatkiDrugiegoRodzica}
                onChange={(e) => {
                  updateKosztyDziecka({
                    wydatkiDrugiegoRodzica: e.target.value
                      ? parseFloat(e.target.value)
                      : "",
                  });
                  // Reset errors when typing
                  if (fieldErrors["wydatkiDrugiegoRodzica"]) {
                    setFieldErrors((prev) => {
                      const updated = { ...prev };
                      delete updated["wydatkiDrugiegoRodzica"];
                      return updated;
                    });
                  }
                  if (error) setError(null);
                }}
                className={`mt-1 ${
                  fieldErrors["wydatkiDrugiegoRodzica"] ? "border-red-500" : ""
                }`}
                placeholder="0"
              />
              {fieldErrors["wydatkiDrugiegoRodzica"] && (
                <p className="text-red-500 text-xs mt-1">
                  {fieldErrors["wydatkiDrugiegoRodzica"]}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Jaką kwotę miesięcznie przeznacza na dziecko drugi rodzic?
              </p>
            </div>{" "}
            <div>
              <Label htmlFor="koszty-sad">
                Koszty uznane przez sąd (jeśli dotyczy)
              </Label>
              <Input
                id="koszty-sad"
                type="number"
                min="0"
                step="0.01"
                value={aktualneKoszty.kosztyUznanePrzezSad}
                onChange={(e) => {
                  updateKosztyDziecka({
                    kosztyUznanePrzezSad: e.target.value
                      ? parseFloat(e.target.value)
                      : "",
                  });
                  // Reset errors when typing
                  if (fieldErrors["kosztyUznanePrzezSad"]) {
                    setFieldErrors((prev) => {
                      const updated = { ...prev };
                      delete updated["kosztyUznanePrzezSad"];
                      return updated;
                    });
                  }
                  if (error) setError(null);
                }}
                className={`mt-1 ${
                  fieldErrors["kosztyUznanePrzezSad"] ? "border-red-500" : ""
                }`}
                placeholder="0"
              />
              {fieldErrors["kosztyUznanePrzezSad"] && (
                <p className="text-red-500 text-xs mt-1">
                  {fieldErrors["kosztyUznanePrzezSad"]}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Jaką miesięczną kwotę jako koszt utrzymania dziecka wskazał sąd
                w swoim postanowieniu?
              </p>
            </div>
            <div>
              <Label>Inne źródła utrzymania dziecka (wielokrotny wybór)</Label>
              <div className="space-y-4 mt-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="renta-rodzinna"
                      checked={
                        aktualneKoszty.inneZrodlaUtrzymania.rentaRodzinna
                      }
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        updateInneZrodla({
                          rentaRodzinna: isChecked,
                          brakDodatkowychZrodel: isChecked
                            ? false
                            : aktualneKoszty.inneZrodlaUtrzymania
                                .brakDodatkowychZrodel,
                        });
                      }}
                    />
                    <Label
                      htmlFor="renta-rodzinna"
                      className="font-normal cursor-pointer"
                    >
                      Renta rodzinna
                    </Label>
                  </div>

                  {aktualneKoszty.inneZrodlaUtrzymania.rentaRodzinna && (
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          aktualneKoszty.inneZrodlaUtrzymania.rentaRodzinnaKwota
                        }
                        onChange={(e) =>
                          updateInneZrodla({
                            rentaRodzinnaKwota: e.target.value
                              ? parseFloat(e.target.value)
                              : "",
                          })
                        }
                        placeholder="Kwota miesięczna"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="swiadczenie-pielegnacyjne"
                      checked={
                        aktualneKoszty.inneZrodlaUtrzymania
                          .swiadczeniePielegnacyjne
                      }
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        updateInneZrodla({
                          swiadczeniePielegnacyjne: isChecked,
                          brakDodatkowychZrodel: isChecked
                            ? false
                            : aktualneKoszty.inneZrodlaUtrzymania
                                .brakDodatkowychZrodel,
                        });
                      }}
                    />
                    <Label
                      htmlFor="swiadczenie-pielegnacyjne"
                      className="font-normal cursor-pointer"
                    >
                      Świadczenie pielęgnacyjne
                    </Label>
                  </div>

                  {aktualneKoszty.inneZrodlaUtrzymania
                    .swiadczeniePielegnacyjne && (
                    <div className="flex-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          aktualneKoszty.inneZrodlaUtrzymania
                            .swiadczeniePielegnacyjneKwota
                        }
                        onChange={(e) =>
                          updateInneZrodla({
                            swiadczeniePielegnacyjneKwota: e.target.value
                              ? parseFloat(e.target.value)
                              : "",
                          })
                        }
                        placeholder="Kwota miesięczna"
                        className="w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="inne-zrodla"
                        checked={aktualneKoszty.inneZrodlaUtrzymania.inne}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          updateInneZrodla({
                            inne: isChecked,
                            brakDodatkowychZrodel: isChecked
                              ? false
                              : aktualneKoszty.inneZrodlaUtrzymania
                                  .brakDodatkowychZrodel,
                          });
                        }}
                      />
                      <Label
                        htmlFor="inne-zrodla"
                        className="font-normal cursor-pointer"
                      >
                        Inne
                      </Label>
                    </div>

                    {aktualneKoszty.inneZrodlaUtrzymania.inne && (
                      <div className="flex-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={aktualneKoszty.inneZrodlaUtrzymania.inneKwota}
                          onChange={(e) =>
                            updateInneZrodla({
                              inneKwota: e.target.value
                                ? parseFloat(e.target.value)
                                : "",
                            })
                          }
                          placeholder="Kwota miesięczna"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {aktualneKoszty.inneZrodlaUtrzymania.inne && (
                    <Input
                      value={aktualneKoszty.inneZrodlaUtrzymania.inneOpis}
                      onChange={(e) =>
                        updateInneZrodla({ inneOpis: e.target.value })
                      }
                      placeholder="Proszę podać rodzaj"
                      className="ml-6"
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="brak-zrodel"
                    checked={
                      aktualneKoszty.inneZrodlaUtrzymania.brakDodatkowychZrodel
                    }
                    onCheckedChange={(checked) => {
                      const isChecked = checked === true;
                      if (isChecked) {
                        updateInneZrodla({
                          brakDodatkowychZrodel: true,
                          rentaRodzinna: false,
                          rentaRodzinnaKwota: "",
                          swiadczeniePielegnacyjne: false,
                          swiadczeniePielegnacyjneKwota: "",
                          inne: false,
                          inneOpis: "",
                          inneKwota: "",
                        });
                      } else {
                        updateInneZrodla({ brakDodatkowychZrodel: false });
                      }
                    }}
                  />
                  <Label
                    htmlFor="brak-zrodel"
                    className="font-normal cursor-pointer"
                  >
                    Brak dodatkowych źródeł
                  </Label>
                </div>
                {/* Wyświetlenie łącznej kwoty utrzymania */}
                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                  <div className="font-medium">
                    Łączna kwota utrzymania dziecka:
                  </div>
                  <div className="text-xl font-semibold text-blue-700 mt-1">
                    {obliczLacznaKwote(aktualneKoszty).toFixed(2)} zł
                    miesięcznie
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    Suma uwzględnia wszystkie podane powyżej kwoty związane z
                    kosztami utrzymania dziecka.
                  </p>
                </div>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}{" "}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wracam...
                  </>
                ) : (
                  "Wstecz"
                )}
              </Button>{" "}
              <Button
                className="flex-1"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisuję...
                  </>
                ) : aktualneDzieckoIndex < kosztyDzieci.length - 1 ? (
                  "Przejdź do następnego dziecka"
                ) : (
                  "Dalej"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
