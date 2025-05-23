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
import { useSecureFormStore } from "@/lib/store/secure-form-store";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, MinusCircle, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectLabel,
} from "@/components/ui/select-simple";
import { childrenFormSchema } from "@/lib/schemas/children-schema";
import {
  generateCSRFToken,
  storeCSRFToken,
  safeToSubmit,
  recordSubmission,
} from "@/lib/client-security";
import {
  safeNavigate,
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";

export default function Dzieci() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();
  const secureStore = useSecureFormStore();

  // CSRF token initialization
  const csrfInitialized = useRef(false);

  useEffect(() => {
    if (!csrfInitialized.current) {
      const token = generateCSRFToken();
      storeCSRFToken(token);
      secureStore.setMetaData({ csrfToken: token });
      csrfInitialized.current = true;
    }
  }, [secureStore]); // Zabezpieczenie - sprawdzamy czy użytkownik przeszedł przez poprzednie kroki
  useEffect(() => {
    if (!formData.podstawaUstalen) {
      router.push("/podstawa-ustalen");
      return;
    }

    // Log informacji o stanie formularza został usunięty przed deploymentem
  }, [formData.podstawaUstalen, router, formData]);

  // Funkcja scrollToTop dla lepszego UX przy przejściach
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Typ dla placówek edukacyjnych
  type PlacowkaEdukacyjna =
    | "zlobek"
    | "przedszkole"
    | "podstawowa"
    | "ponadpodstawowa"
    | "";

  // Inicjalizacja stanu dla liczby dzieci i ich danych z formStore
  const [liczbaDzieci, setLiczbaDzieci] = useState<number>(
    formData.liczbaDzieci || 1
  );

  // Inicjalizacja stanu dla śledzenia aktualnie wypełnianego dziecka
  const [aktualneDzieckoIndex, setAktualneDzieckoIndex] = useState<number>(
    formData.aktualneDzieckoIndex || 0
  );

  // Stan dla dzieci, które zostały już wypełnione
  const [zakonczoneIndeksyDzieci, setZakonczoneIndeksyDzieci] = useState<
    number[]
  >(formData.zakonczoneIndeksyDzieci || []);

  // Typ dla błędów pól formularza
  type FieldErrors = {
    [dzieckoId: number]: {
      wiek?: string;
      plec?: string;
      opisSpecjalnychPotrzeb?: string;
      typPlacowki?: string;
      opiekaInnejOsoby?: string;
      modelOpieki?: string;
    };
  };

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [dzieci, setDzieci] = useState<
    Array<{
      id: number;
      wiek: number | "";
      plec: "K" | "M" | "I" | "";
      specjalnePotrzeby: boolean;
      opisSpecjalnychPotrzeb: string;
      uczeszczeDoPlacowki: boolean;
      typPlacowki: PlacowkaEdukacyjna;
      opiekaInnejOsoby: boolean | null;
      modelOpieki: "50/50" | "inny" | "";
    }>
  >(
    formData.dzieci?.map(
      (d: {
        id: number;
        wiek: number;
        plec: "K" | "M" | "I";
        specjalnePotrzeby: boolean;
        opisSpecjalnychPotrzeb?: string;
        uczeszczeDoPlacowki?: boolean;
        typPlacowki?: PlacowkaEdukacyjna;
        opiekaInnejOsoby?: boolean | null;
        modelOpieki?: "50/50" | "inny";
      }) => ({
        id: d.id,
        wiek: typeof d.wiek === "number" ? d.wiek : "",
        plec: d.plec,
        specjalnePotrzeby: d.specjalnePotrzeby,
        opisSpecjalnychPotrzeb: d.opisSpecjalnychPotrzeb || "",
        uczeszczeDoPlacowki: d.uczeszczeDoPlacowki ?? false,
        typPlacowki: d.typPlacowki || "",
        opiekaInnejOsoby: d.opiekaInnejOsoby ?? null,
        modelOpieki: d.modelOpieki || "",
      })
    ) || [
      {
        id: 1,
        wiek: "",
        plec: "",
        specjalnePotrzeby: false,
        opisSpecjalnychPotrzeb: "",
        uczeszczeDoPlacowki: false,
        typPlacowki: "",
        opiekaInnejOsoby: null,
        modelOpieki: "",
      },
    ]
  );
  const [error, setError] = useState<string | null>(null);

  // Stan przycisku do zapobiegania wielokrotnym kliknięciom
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Aktualizacja dzieci, gdy zmieni się liczba dzieci
  useEffect(() => {
    // Jeśli brakuje dzieci, dodajemy nowe
    if (dzieci.length < liczbaDzieci) {
      const noweDzieci = [...dzieci];
      for (let i = dzieci.length + 1; i <= liczbaDzieci; i++) {
        noweDzieci.push({
          id: i,
          wiek: "",
          plec: "",
          specjalnePotrzeby: false,
          opisSpecjalnychPotrzeb: "",
          uczeszczeDoPlacowki: false,
          typPlacowki: "",
          opiekaInnejOsoby: null,
          modelOpieki: "",
        });
      }
      setDzieci(noweDzieci);
    }
    // Jeśli jest za dużo dzieci, usuwamy nadmiarowe
    else if (dzieci.length > liczbaDzieci) {
      setDzieci(dzieci.slice(0, liczbaDzieci));
      // Usuwamy również błędy dla usuniętych dzieci
      const newFieldErrors = { ...fieldErrors };
      for (let i = liczbaDzieci; i < dzieci.length; i++) {
        delete newFieldErrors[dzieci[i].id];
      }
      setFieldErrors(newFieldErrors);
    }
  }, [liczbaDzieci, dzieci, fieldErrors]);

  // Funkcja do aktualizacji danych dziecka
  const updateDziecko = (index: number, data: Partial<(typeof dzieci)[0]>) => {
    const noweDzieci = [...dzieci];
    noweDzieci[index] = { ...noweDzieci[index], ...data };
    setDzieci(noweDzieci);
  };

  // Funkcja do obsługi przejścia do następnego kroku
  const handleNext = useCallback(async () => {
    // Zapobieganie wielokrotnym kliknięciom z wizualnym feedbackiem
    if (isSubmitting || !safeToSubmit()) {
      trackedLog(
        "user-action",
        "Form submission prevented: Already submitting or too soon after last submission"
      );
      return;
    }

    // Unikalny identyfikator dla bieżącej operacji (dla debugowania)
    const operationId = generateOperationId();
    trackedLog(operationId, "Starting children form submission");

    setIsSubmitting(true);
    setError(null);
    setFieldErrors({});

    // Walidujemy tylko aktualne dziecko
    const aktualneDziecko = dzieci[aktualneDzieckoIndex];
    if (!aktualneDziecko) {
      setIsSubmitting(false);
      return;
    }

    try {
      // Walidacja danych przy użyciu schematu Zod dla aktualnego dziecka
      trackedLog(operationId, "Validating form data for current child", {
        childIndex: aktualneDzieckoIndex,
        childId: aktualneDziecko.id,
      });

      const dzieckoToValidate = {
        id: aktualneDziecko.id,
        wiek: aktualneDziecko.wiek,
        plec: aktualneDziecko.plec,
        specjalnePotrzeby: aktualneDziecko.specjalnePotrzeby,
        opisSpecjalnychPotrzeb: aktualneDziecko.opisSpecjalnychPotrzeb,
        uczeszczeDoPlacowki: aktualneDziecko.uczeszczeDoPlacowki,
        typPlacowki: aktualneDziecko.typPlacowki,
        opiekaInnejOsoby: aktualneDziecko.opiekaInnejOsoby,
        modelOpieki: aktualneDziecko.modelOpieki,
      };

      // Walidacja dla jednego dziecka
      const validationResult = childrenFormSchema.safeParse({
        liczbaDzieci: 1,
        dzieci: [dzieckoToValidate],
      });

      if (!validationResult.success) {
        // Przetwarzamy błędy specyficzne dla pól formularza
        const newFieldErrors: FieldErrors = {};

        // Funkcja do oczyszczania komunikatów błędów
        const cleanErrorMessage = (msg: string, fieldName?: string): string => {
          // Usunięcie technicznych informacji o enumach
          if (msg.startsWith("Invalid enum value")) {
            if (fieldName === "plec" || msg.includes("plec"))
              return "Proszę wybrać płeć dziecka";
            if (fieldName === "typPlacowki" || msg.includes("typPlacowki"))
              return "Proszę wybrać typ placówki edukacyjnej";
            if (fieldName === "modelOpieki" || msg.includes("modelOpieki"))
              return "Proszę wybrać model opieki";
            return "Proszę wybrać poprawną opcję";
          }
          return msg;
        };

        // Mapowanie pól na bardziej przyjazne nazwy
        const fieldNameMapping: Record<string, string> = {
          wiek: "Wiek dziecka",
          plec: "Płeć dziecka",
          opisSpecjalnychPotrzeb: "Opis specjalnych potrzeb",
          uczeszczeDoPlacowki: "Uczęszczanie do placówki",
          typPlacowki: "Typ placówki edukacyjnej",
          opiekaInnejOsoby: "Opieka innej osoby",
          modelOpieki: "Model opieki",
        };

        // Analizujemy wszystkie problemy walidacji
        validationResult.error.issues.forEach((issue) => {
          // Sprawdzamy czy błąd dotyczy konkretnego dziecka i pola
          if (
            issue.path.length >= 3 &&
            issue.path[0] === "dzieci" &&
            typeof issue.path[1] === "number" &&
            typeof issue.path[2] === "string"
          ) {
            const fieldName = issue.path[2];
            const dzieckoId = aktualneDziecko.id;

            // Inicjalizujemy obiekt błędów dla dziecka, jeśli nie istnieje
            if (!newFieldErrors[dzieckoId]) {
              newFieldErrors[dzieckoId] = {};
            }

            // Czyścimy komunikaty błędów z informacji technicznych
            let errorMessage = issue.message;
            if (errorMessage.startsWith("Invalid enum value")) {
              if (fieldName === "plec")
                errorMessage = "Proszę wybrać płeć dziecka";
              else if (fieldName === "typPlacowki")
                errorMessage = "Proszę wybrać typ placówki";
              else if (fieldName === "modelOpieki")
                errorMessage = "Proszę wybrać model opieki";
              else errorMessage = "Proszę wybrać wartość z listy";
            } else if (
              fieldName === "wiek" &&
              errorMessage.includes("Required")
            ) {
              errorMessage = "Wiek dziecka jest wymagany";
            } else if (
              fieldName === "opisSpecjalnychPotrzeb" &&
              errorMessage.includes("Required")
            ) {
              errorMessage = "Proszę opisać specjalne potrzeby dziecka";
            } else if (fieldName === "opiekaInnejOsoby") {
              errorMessage =
                "Proszę określić, czy dziecko pozostaje pod opieką innej osoby";
            }

            // Zapisujemy błąd w odpowiednim polu
            newFieldErrors[dzieckoId][
              fieldName as keyof (typeof newFieldErrors)[number]
            ] = errorMessage;
          }
        });

        // Ustawiamy błędy pól
        if (Object.keys(newFieldErrors).length > 0) {
          setFieldErrors(newFieldErrors);
        }

        // Przygotowanie komunikatu błędu
        const formattedErrors = validationResult.error.format();
        let errorMessage = "";

        // Najpierw sprawdzamy błędy na poziomie formularza
        if (formattedErrors._errors?.length) {
          errorMessage = formattedErrors._errors[0];
        }
        // Następnie błędy na poziomie dzieci
        else if (formattedErrors.dzieci?._errors?.length) {
          errorMessage = formattedErrors.dzieci._errors[0];
        }
        // Następnie błędy dla poszczególnych dzieci
        else {
          const childErrors = formattedErrors.dzieci?.[0];
          if (childErrors) {
            // Sprawdzamy wszystkie pola z mapowania
            for (const [field, displayName] of Object.entries(
              fieldNameMapping
            )) {
              const fieldErrors =
                childErrors[field as keyof typeof childErrors];
              if (
                fieldErrors &&
                "_errors" in fieldErrors &&
                fieldErrors._errors?.length
              ) {
                errorMessage = `${displayName} - ${cleanErrorMessage(
                  fieldErrors._errors[0],
                  field
                )}`;
                break;
              }
            }

            // Jeśli nadal nie mamy komunikatu, sprawdzamy ogólny błąd
            if (!errorMessage && childErrors._errors?.length) {
              errorMessage = `${cleanErrorMessage(childErrors._errors[0])}`;
            }
          }
        }

        // Jeśli nie znaleźliśmy szczegółowego błędu, sprawdzamy jeszcze raw errors
        if (!errorMessage) {
          // Przeglądamy wszystkie błędy w tablicy błędów
          const allIssues = validationResult.error.issues;
          if (allIssues.length > 0) {
            const issue = allIssues[0];
            const fieldName =
              issue.path.length >= 3 ? (issue.path[2] as string) : "";
            const displayName = fieldName
              ? fieldNameMapping[fieldName] || fieldName
              : "";

            errorMessage = `${
              displayName ? displayName : ""
            } - ${cleanErrorMessage(issue.message, fieldName)}`;
          } else {
            errorMessage = "Proszę poprawić błędy w formularzu";
          }
        }

        trackedLog(operationId, "Validation failed", errorMessage, "warn");
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      trackedLog(operationId, "Validation successful, proceeding to save data");

      // Przygotowanie danych do zapisu - aktualizujemy wszystkie dzieci
      const dzieciDoZapisu = dzieci.map((d) => ({
        id: d.id,
        wiek: typeof d.wiek === "number" ? d.wiek : 0,
        plec: d.plec as "K" | "M" | "I",
        specjalnePotrzeby: d.specjalnePotrzeby,
        opisSpecjalnychPotrzeb: d.specjalnePotrzeby
          ? d.opisSpecjalnychPotrzeb
          : undefined,
        uczeszczeDoPlacowki: d.uczeszczeDoPlacowki,
        typPlacowki: d.uczeszczeDoPlacowki ? d.typPlacowki : undefined,
        opiekaInnejOsoby: !d.uczeszczeDoPlacowki
          ? d.opiekaInnejOsoby
          : undefined,
        modelOpieki: d.modelOpieki as "50/50" | "inny",
      }));

      // Jeśli to ostatnie dziecko, oznaczamy je jako zakończone
      let noweZakonczoneIndeksyDzieci = [...zakonczoneIndeksyDzieci];
      if (!noweZakonczoneIndeksyDzieci.includes(aktualneDzieckoIndex)) {
        noweZakonczoneIndeksyDzieci.push(aktualneDzieckoIndex);
      } // Zapisujemy dane do store'a wykorzystując mechanizm ponownych prób
      try {
        await retryOperation(
          async () => {
            await updateFormData({
              liczbaDzieci,
              dzieci: dzieciDoZapisu,
              // Zachowujemy aktualny indeks dziecka (nie inkrementujemy go tutaj)
              aktualneDzieckoIndex: aktualneDzieckoIndex,
              zakonczoneIndeksyDzieci: noweZakonczoneIndeksyDzieci,
              // Ustawiamy ID dziecka dla tabeli czasu
              aktualneDzieckoWTabeliCzasu:
                dzieciDoZapisu[aktualneDzieckoIndex].id,
              __meta: {
                lastUpdated: Date.now(),
                formVersion: "1.1.0",
              },
            });
            return true;
          },
          {
            maxAttempts: 3,
            delayMs: 300,
            operationName: "Update form data - dzieci",
            operationId,
          }
        );

        // Zapisujemy informację o submisji formularza dla celów analizy
        recordSubmission();
        trackedLog(operationId, "Data successfully saved");

        // Przewijamy stronę do góry przed przejściem do następnej strony
        scrollToTop();

        // Określenie następnego kroku na podstawie modelu opieki aktualnego dziecka
        const aktualneDzieckoData = dzieciDoZapisu[aktualneDzieckoIndex]; // Dla każdego dziecka (niezależnie czy pierwsze, ostatnie czy pośrednie)
        // przechodzimy do kolejnej strony w cyklu tego dziecka
        trackedLog(
          operationId,
          `Moving to the next page in the child cycle for child ${
            aktualneDzieckoIndex + 1
          }`
        );

        // Bezpieczna nawigacja z opóźnieniem dla lepszego UX
        setTimeout(() => {
          // Wybieramy ścieżkę w zależności od modelu opieki
          const targetPath =
            aktualneDzieckoData.modelOpieki === "inny"
              ? "/czas-opieki"
              : "/koszty-utrzymania";

          trackedLog(operationId, `Navigating to ${targetPath}`);
          router.push(targetPath);

          // Zmniejszamy szansę na back button lub podwójną submisję
          setTimeout(() => {
            setIsSubmitting(false);
          }, 500);
        }, 100);
      } catch (error) {
        trackedLog(operationId, "Error saving data", error, "error");
        setIsSubmitting(false);
        setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      }
    } catch (error) {
      trackedLog(operationId, "Unexpected error", error, "error");
      setIsSubmitting(false);
      setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
    }
  }, [
    dzieci,
    liczbaDzieci,
    aktualneDzieckoIndex,
    zakonczoneIndeksyDzieci,
    router,
    scrollToTop,
    updateFormData,
    isSubmitting,
  ]);

  // Funkcja do obsługi powrotu do poprzedniego kroku
  const handleBack = useCallback(() => {
    // Zapobieganie wielokrotnym kliknięciom
    if (isSubmitting) return;

    const operationId = generateOperationId();

    // Jeśli jesteśmy przy pierwszym dziecku, wracamy do poprzedniego kroku
    if (aktualneDzieckoIndex === 0) {
      trackedLog(operationId, "Navigating back to podstawa-ustalen");

      // Przewijamy stronę do góry przed przejściem do poprzedniej strony
      scrollToTop();

      // Dodajemy małe opóźnienie dla lepszego UX
      setTimeout(() => {
        router.push("/podstawa-ustalen");
      }, 100);
    } else {
      // Wracamy do poprzedniego dziecka
      trackedLog(operationId, "Moving back to previous child");
      setAktualneDzieckoIndex(aktualneDzieckoIndex - 1);
    }
  }, [isSubmitting, router, scrollToTop, aktualneDzieckoIndex]);

  // Pobierz aktualne dziecko
  const aktualneDziecko = dzieci[aktualneDzieckoIndex];

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={4} totalSteps={12} />
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Informacje o dzieciach</h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      Informacje o dzieciach są kluczowe do ustalenia
                      odpowiedniej wysokości alimentów.
                    </p>
                    <p>
                      Wiek dzieci wpływa na ich potrzeby, a specjalne
                      okoliczności mogą znacząco zwiększyć koszty utrzymania.
                    </p>
                  </div>
                }
              />
            </div>
            <div className="space-y-4">
              <p className="text-sky-950">
                Ta część formularza dotyczy dzieci, których sytuacja
                alimentacyjna lub sposób dzielenia się kosztami utrzymania
                została już w jakiś sposób ustalona.
              </p>
              <p className="text-sky-950">
                W AliMatrix wierzymy, że rzetelna analiza zaczyna się od
                zrozumienia konkretu – a potrzeby dziecka są jednym z jego
                najważniejszych wymiarów. W kolejnych krokach poprosimy Cię o
                informacje, które pomogą określić, jak wygląda Wasza codzienność
                – opieka, czas spędzany z dzieckiem, jego wiek, edukacja oraz
                rzeczywiste wydatki.
              </p>
              <p className="text-sky-950">
                Te dane są nie tylko potrzebne do przygotowania raportu – mogą
                pomóc również Tobie, by lepiej zobaczyć strukturę codzienności i
                odpowiedzialności. Wiele osób dopiero w trakcie tego etapu
                uświadamia sobie, jak naprawdę wygląda podział czasu i kosztów
                związanych z wychowaniem.
              </p>
              <h3>Liczba dzieci</h3>
              <p className="text-sky-950">
                Ile dzieci objętych jest ustaleniami dotyczącymi alimentów lub
                współfinansowania kosztów życia?{" "}
                <strong>
                  (Od tej liczby będzie zależeć, ile razy wyświetlimy Tobie
                  kolejne pytania – dane każdego dziecka zbieramy oddzielnie.)
                </strong>
              </p>
              <div>
                <Label htmlFor="liczbaDzieci">Liczba dzieci</Label>
                <div className="flex items-center mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setLiczbaDzieci(Math.max(1, liczbaDzieci - 1))
                    }
                    className="h-10 w-10"
                  >
                    <MinusCircle className="h-4 w-4" />
                  </Button>
                  <div className="w-12 text-center font-medium">
                    {liczbaDzieci}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setLiczbaDzieci(Math.min(10, liczbaDzieci + 1))
                    }
                    className="h-10 w-10"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Pasek postępu dzieci */}{" "}
              <div className="flex justify-between items-center mb-1">
                <div className="text-lg font-medium">
                  Dziecko {aktualneDzieckoIndex + 1} z {liczbaDzieci}
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: liczbaDzieci }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full ${
                        zakonczoneIndeksyDzieci.includes(idx)
                          ? "bg-green-500"
                          : idx === aktualneDzieckoIndex
                          ? "bg-blue-500"
                          : "bg-gray-200"
                      }`}
                      title={`Dziecko ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Ważne:</strong> Po wypełnieniu podstawowych informacji
                  dla tego dziecka, przejdziesz do kolejnych formularzy
                  dotyczących tego samego dziecka. Po wypełnieniu pełnego cyklu
                  dla jednego dziecka, wrócisz tutaj, aby podać dane kolejnego
                  dziecka.
                </p>
              </div>
              {/* Wyświetlanie tylko aktualnego dziecka */}
              {aktualneDziecko && (
                <div className="p-4 border-2 border-gray-200 rounded-lg">
                  <h3 className="font-medium mb-3">
                    Dziecko {aktualneDzieckoIndex + 1}
                  </h3>

                  {/* 1. Wiek dziecka */}
                  <div className="mb-6">
                    <Label
                      htmlFor={`wiek-${aktualneDziecko.id}`}
                      className="text-lg font-medium"
                    >
                      1. Wiek dziecka
                    </Label>
                    <p className="text-sm text-gray-600 mb-2">
                      Wiek dziecka wpływa na ocenę adekwatności kosztów i
                      stopnia zaangażowania opiekuńczego. Inne potrzeby ma
                      niemowlę, inne nastolatek.
                    </p>{" "}
                    <Input
                      id={`wiek-${aktualneDziecko.id}`}
                      type="number"
                      min="0"
                      max="26"
                      value={aktualneDziecko.wiek}
                      onChange={(e) => {
                        // Czyścimy potencjalny błąd po zmianie wartości
                        if (fieldErrors[aktualneDziecko.id]?.wiek) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            [aktualneDziecko.id]: {
                              ...prev[aktualneDziecko.id],
                              wiek: undefined,
                            },
                          }));
                        }
                        updateDziecko(aktualneDzieckoIndex, {
                          wiek: e.target.value ? parseInt(e.target.value) : "",
                        });
                      }}
                      className={`mt-1 ${
                        fieldErrors[aktualneDziecko.id]?.wiek
                          ? "border-red-500"
                          : ""
                      }`}
                    />
                    {fieldErrors[aktualneDziecko.id]?.wiek && (
                      <p className="text-red-500 text-xs mt-1">
                        {fieldErrors[aktualneDziecko.id]?.wiek}
                      </p>
                    )}
                  </div>

                  {/* 2. Płeć dziecka */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`plec-${aktualneDziecko.id}`}
                        className="text-lg font-medium"
                      >
                        2. Płeć dziecka
                      </Label>
                      <InfoTooltip
                        content={
                          <div className="space-y-2 text-sm">
                            <p>
                              Informacja ta może pomóc w lepszym dopasowaniu
                              raportu i analizie różnic w sytuacji dzieci
                              różnych płci. Nie zwiększa ryzyka identyfikacji
                              danych i nie jest wymagana, jeśli nie chcesz jej
                              podawać.
                            </p>
                          </div>
                        }
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      Zaznacz, jakiej płci jest dziecko, którego dotyczą dane w
                      formularzu.
                    </p>
                    <p className="text-sm text-gray-600 font-medium mb-2">
                      Dlaczego pytamy?
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Płeć dziecka może mieć wpływ na sposób sprawowania opieki,
                      orzeczenia sądowe i wysokość alimentów – niekiedy z
                      powodów kulturowych lub praktycznych. Te dane pozwolą nam
                      lepiej zrozumieć, jak wygląda rzeczywistość rodziców w
                      różnych sytuacjach.
                    </p>
                    {/* Zastąpienie radio buttonów na Select */}{" "}
                    <Select
                      value={aktualneDziecko.plec}
                      onValueChange={(value) => {
                        // Czyścimy potencjalny błąd po zmianie wartości
                        if (fieldErrors[aktualneDziecko.id]?.plec) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            [aktualneDziecko.id]: {
                              ...prev[aktualneDziecko.id],
                              plec: undefined,
                            },
                          }));
                        }
                        updateDziecko(aktualneDzieckoIndex, {
                          plec: value as "K" | "M" | "I",
                        });
                      }}
                    >
                      <SelectTrigger
                        className={`w-full ${
                          fieldErrors[aktualneDziecko.id]?.plec
                            ? "border-red-500 ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Wybierz płeć dziecka" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Chłopiec</SelectItem>
                        <SelectItem value="K">Dziewczynka</SelectItem>
                        <SelectItem value="I">
                          Inna / wolę nie podawać
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors[aktualneDziecko.id]?.plec && (
                      <p className="text-red-500 text-xs mt-1">
                        {fieldErrors[aktualneDziecko.id]?.plec}
                      </p>
                    )}
                  </div>

                  {/* 3. Placówka edukacyjna */}
                  <div className="mb-6">
                    <Label
                      htmlFor={`placowka-${aktualneDziecko.id}`}
                      className="text-lg font-medium"
                    >
                      3. Czy dziecko uczęszcza do placówki edukacyjnej?
                    </Label>

                    {/* Zastąpienie radio buttonów na Select */}
                    <div className="mt-2">
                      <Select
                        value={
                          aktualneDziecko.uczeszczeDoPlacowki ? "tak" : "nie"
                        }
                        onValueChange={(value) => {
                          const uczeszczeDoPlacowki = value === "tak";
                          updateDziecko(aktualneDzieckoIndex, {
                            uczeszczeDoPlacowki,
                            typPlacowki: uczeszczeDoPlacowki
                              ? aktualneDziecko.typPlacowki
                              : "",
                            opiekaInnejOsoby: !uczeszczeDoPlacowki
                              ? aktualneDziecko.opiekaInnejOsoby
                              : null,
                          });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Wybierz odpowiedź" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tak">Tak</SelectItem>
                          <SelectItem value="nie">Nie</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Wybór typu placówki edukacyjnej */}
                    {aktualneDziecko.uczeszczeDoPlacowki && (
                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">
                          Wybierz typ placówki:
                        </p>
                        {/* Zastąpienie radio buttonów na Select */}{" "}
                        <Select
                          value={aktualneDziecko.typPlacowki}
                          onValueChange={(value) => {
                            // Czyścimy potencjalny błąd po zmianie wartości
                            if (fieldErrors[aktualneDziecko.id]?.typPlacowki) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                [aktualneDziecko.id]: {
                                  ...prev[aktualneDziecko.id],
                                  typPlacowki: undefined,
                                },
                              }));
                            }
                            updateDziecko(aktualneDzieckoIndex, {
                              typPlacowki: value as PlacowkaEdukacyjna,
                            });
                          }}
                        >
                          <SelectTrigger
                            className={`w-full ${
                              fieldErrors[aktualneDziecko.id]?.typPlacowki
                                ? "border-red-500 ring-red-500"
                                : ""
                            }`}
                          >
                            <SelectValue placeholder="Wybierz typ placówki" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zlobek">Żłobek</SelectItem>
                            <SelectItem value="przedszkole">
                              Przedszkole
                            </SelectItem>
                            <SelectItem value="podstawowa">
                              Szkoła podstawowa
                            </SelectItem>
                            <SelectItem value="ponadpodstawowa">
                              Szkoła ponadpodstawowa
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldErrors[aktualneDziecko.id]?.typPlacowki && (
                          <p className="text-red-500 text-xs mt-1">
                            {fieldErrors[aktualneDziecko.id]?.typPlacowki}
                          </p>
                        )}
                        <div className="mt-2 p-3 bg-blue-50 rounded-md flex items-start">
                          <span className="text-blue-500 mr-2">ℹ️</span>
                          <p className="text-sm text-blue-700">
                            Pamiętaj, by uwzględnić koszty edukacji w sekcji
                            dotyczącej wydatków.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Opieka innej osoby, jeśli nie uczęszcza do placówki */}
                    {aktualneDziecko.uczeszczeDoPlacowki === false && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-medium text-gray-700">
                            Czy ktoś inny niż rodzice sprawuje nad dzieckiem
                            stałą, regularną opiekę?
                          </p>
                          <InfoTooltip
                            content={
                              <div className="space-y-2 text-sm">
                                <p>
                                  To pytanie dotyczy sytuacji, w której opieka
                                  nad dzieckiem odbywa się poza placówką
                                  edukacyjną, ale jest powierzona osobie
                                  trzeciej w sposób regularny (np. codziennie
                                  lub kilka razy w tygodniu).
                                </p>
                              </div>
                            }
                          />
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          Jeśli dziecko nie uczęszcza do żłobka, przedszkola lub
                          szkoły, wskaż, czy znajduje się pod opieką innej osoby
                          w sposób powtarzalny (np. opiekunka, dziadkowie, inny
                          członek rodziny).
                        </p>
                        {/* Zastąpienie radio buttonów na Select */}{" "}
                        <Select
                          value={
                            aktualneDziecko.opiekaInnejOsoby === null
                              ? ""
                              : aktualneDziecko.opiekaInnejOsoby
                              ? "tak"
                              : "nie"
                          }
                          onValueChange={(value) => {
                            // Czyścimy potencjalny błąd po zmianie wartości
                            if (
                              fieldErrors[aktualneDziecko.id]?.opiekaInnejOsoby
                            ) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                [aktualneDziecko.id]: {
                                  ...prev[aktualneDziecko.id],
                                  opiekaInnejOsoby: undefined,
                                },
                              }));
                            }
                            updateDziecko(aktualneDzieckoIndex, {
                              opiekaInnejOsoby:
                                value === "tak"
                                  ? true
                                  : value === "nie"
                                  ? false
                                  : null,
                            });
                          }}
                        >
                          <SelectTrigger
                            className={`w-full ${
                              fieldErrors[aktualneDziecko.id]?.opiekaInnejOsoby
                                ? "border-red-500 ring-red-500"
                                : ""
                            }`}
                          >
                            <SelectValue placeholder="Wybierz odpowiedź" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tak">
                              Tak – dziecko pozostaje pod stałą opieką innej
                              osoby (np. opiekunki, dziadków)
                            </SelectItem>
                            <SelectItem value="nie">
                              Nie – dziecko przebywa wyłącznie pod opieką
                              rodziców
                            </SelectItem>{" "}
                          </SelectContent>
                        </Select>
                        {fieldErrors[aktualneDziecko.id]?.opiekaInnejOsoby && (
                          <p className="text-red-500 text-xs mt-1">
                            {fieldErrors[aktualneDziecko.id]?.opiekaInnejOsoby}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 4. Specjalne potrzeby */}
                  <div className="mb-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`specjalne-${aktualneDziecko.id}`}
                        checked={aktualneDziecko.specjalnePotrzeby}
                        onCheckedChange={(checked) =>
                          updateDziecko(aktualneDzieckoIndex, {
                            specjalnePotrzeby: !!checked,
                          })
                        }
                      />
                      <Label
                        htmlFor={`specjalne-${aktualneDziecko.id}`}
                        className="font-medium cursor-pointer"
                      >
                        4. Dziecko ma specjalne potrzeby zdrowotne lub
                        edukacyjne
                      </Label>
                    </div>

                    {aktualneDziecko.specjalnePotrzeby && (
                      <div className="mt-3">
                        <Label htmlFor={`opis-${aktualneDziecko.id}`}>
                          Opisz krótko specjalne potrzeby
                        </Label>{" "}
                        <Input
                          id={`opis-${aktualneDziecko.id}`}
                          value={aktualneDziecko.opisSpecjalnychPotrzeb}
                          onChange={(e) => {
                            // Czyścimy potencjalny błąd po zmianie wartości
                            if (
                              fieldErrors[aktualneDziecko.id]
                                ?.opisSpecjalnychPotrzeb
                            ) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                [aktualneDziecko.id]: {
                                  ...prev[aktualneDziecko.id],
                                  opisSpecjalnychPotrzeb: undefined,
                                },
                              }));
                            }
                            updateDziecko(aktualneDzieckoIndex, {
                              opisSpecjalnychPotrzeb: e.target.value,
                            });
                          }}
                          placeholder="np. alergia, niepełnosprawność, zajęcia dodatkowe"
                          className={`mt-1 ${
                            fieldErrors[aktualneDziecko.id]
                              ?.opisSpecjalnychPotrzeb
                              ? "border-red-500"
                              : ""
                          }`}
                        />
                        {fieldErrors[aktualneDziecko.id]
                          ?.opisSpecjalnychPotrzeb && (
                          <p className="text-red-500 text-xs mt-1">
                            {
                              fieldErrors[aktualneDziecko.id]
                                ?.opisSpecjalnychPotrzeb
                            }
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Model opieki */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`model-opieki-${aktualneDziecko.id}`}
                        className="text-lg font-medium"
                      >
                        5. Sposób sprawowania opieki
                      </Label>
                      <InfoTooltip
                        content={
                          <div className="space-y-2 text-sm">
                            <p>
                              Jeśli wybierzesz „Inny układ", przejdziesz do
                              formularza, który pomoże określić procentowy
                              podział opieki na podstawie rzeczywistego czasu
                              spędzanego z dzieckiem.
                            </p>
                          </div>
                        }
                      />
                    </div>

                    {/* Zastąpienie radio buttonów na Select */}
                    <div className="mt-2">
                      {" "}
                      <Select
                        value={aktualneDziecko.modelOpieki}
                        onValueChange={(value) => {
                          // Czyścimy potencjalny błąd po zmianie wartości
                          if (fieldErrors[aktualneDziecko.id]?.modelOpieki) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              [aktualneDziecko.id]: {
                                ...prev[aktualneDziecko.id],
                                modelOpieki: undefined,
                              },
                            }));
                          }
                          updateDziecko(aktualneDzieckoIndex, {
                            modelOpieki: value as "50/50" | "inny",
                          });
                        }}
                      >
                        <SelectTrigger
                          className={`w-full ${
                            fieldErrors[aktualneDziecko.id]?.modelOpieki
                              ? "border-red-500 ring-red-500"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Wybierz model opieki" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="50/50">
                            Opieka naprzemienna (50/50)
                          </SelectItem>
                          <SelectItem value="inny">
                            Inny układ – np. dziecko spędza większość czasu u
                            jednego z rodziców
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldErrors[aktualneDziecko.id]?.modelOpieki && (
                        <p className="text-red-500 text-xs mt-1">
                          {fieldErrors[aktualneDziecko.id]?.modelOpieki}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wyświetlanie błędu walidacji */}
            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Wstecz
              </Button>
              <Button
                className="flex-1"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {" "}
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Zapisuję...
                  </>
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
