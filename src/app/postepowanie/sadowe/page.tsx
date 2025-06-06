"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useFormStore } from "@/lib/store/form-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import {
  APPELATIONS,
  REGIONAL_COURTS,
  getRegionalCourts,
  getDistrictCourt,
  getAppellation,
} from "@/lib/court-data-hierarchical";
import {
  PostepowanieSadoweData,
  RodzajSadu,
  LiczbaSedzi,
  PlecSedziego,
  TakNie,
  WatekWiny,
} from "./typings";
import { postepowanieSadoweSchema } from "@/lib/schemas/postepowanie-sadowe-schema";
import {
  generateCSRFToken,
  storeCSRFToken,
  safeToSubmit,
  recordSubmission,
} from "@/lib/client-security";
import {
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";

export default function PostepowanieSadowe() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // CSRF token initialization - enhanced security protection
  const csrfInitialized = useRef(false);

  useEffect(() => {
    if (!csrfInitialized.current) {
      const operationId = generateOperationId();
      trackedLog(
        operationId,
        "Initializing CSRF protection for court proceedings"
      );

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

      trackedLog(
        operationId,
        "CSRF protection initialized for court proceedings"
      );
    }
  }, [updateFormData]);

  // Stan dla błędów walidacji
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Stan oceny adekwatności postępowania
  const [ocenaAdekwatnosci, setOcenaAdekwatnosci] = useState<number>(
    formData.ocenaAdekwatnosciSad || 3
  );

  // Stany dla daty decyzji
  const [rokDecyzji, setRokDecyzji] = useState<string>(
    formData.rokDecyzjiSad || ""
  );
  const [miesiacDecyzji, setMiesiacDecyzji] = useState<string>(
    formData.miesiacDecyzjiSad || ""
  );

  // Stany dla sądu
  const [rodzajSadu, setRodzajSadu] = useState<RodzajSadu>(
    (formData.rodzajSaduSad as RodzajSadu) || "nie_pamietam"
  );
  const [apelacjaSad, setApelacjaSad] = useState<string>(
    formData.apelacjaSad || ""
  );
  const [sadOkregowyId, setSadOkregowyId] = useState<string>(
    formData.sadOkregowyId || ""
  );
  const [sadRejonowyId, setSadRejonowyId] = useState<string>(
    formData.sadRejonowyId || ""
  );

  // Stany dostępnych sądów rejonowych
  const [dostepneSadyRejonowe, setDostepneSadyRejonowe] = useState<any[]>([]);

  // Aktualizacja dostępnych sądów rejonowych przy zmianie sądu okręgowego
  useEffect(() => {
    if (sadOkregowyId) {
      const rejonowe = getRegionalCourts(sadOkregowyId);
      setDostepneSadyRejonowe(rejonowe);

      // Resetuj wybór sądu rejonowego, jeśli wybrany wcześniej sąd nie jest dostępny
      if (sadRejonowyId) {
        const istnieje = rejonowe.some((sad) => sad.id === sadRejonowyId);
        if (!istnieje) {
          setSadRejonowyId("");
        }
      }
    } else {
      setDostepneSadyRejonowe([]);
      setSadRejonowyId("");
    }
  }, [sadOkregowyId, sadRejonowyId]);

  // Inne stany
  const [liczbaSedzi, setLiczbaSedzi] = useState<LiczbaSedzi>(
    (formData.liczbaSedzi as LiczbaSedzi) || "jeden"
  );
  const [plecSedziego, setPlecSedziego] = useState<PlecSedziego>(
    (formData.plecSedziego as PlecSedziego) || "kobieta"
  );
  const [inicjalySedziego, setInicjalySedziego] = useState<string>(
    formData.inicjalySedziego || ""
  );
  const [czyPozew, setCzyPozew] = useState<TakNie>(
    (formData.czyPozew as TakNie) || "nie"
  );
  const [watekWiny, setWatekWiny] = useState<WatekWiny>(
    (formData.watekWiny as WatekWiny) || "nie"
  );

  // Generowanie opcji lat
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) =>
    (currentYear - i).toString()
  );

  // Funkcja walidacji formularza
  const validateForm = useCallback(() => {
    try {
      // Przygotowanie danych do walidacji
      const formDataToValidate = {
        ocenaAdekwatnosciSad: ocenaAdekwatnosci,
        wariantPostepu: "court",
        rokDecyzjiSad: rokDecyzji,
        miesiacDecyzjiSad: miesiacDecyzji,
        rodzajSaduSad: rodzajSadu,
        apelacjaSad: apelacjaSad,
        apelacjaId: apelacjaSad,
        apelacjaNazwa: apelacjaSad
          ? getAppellation(apelacjaSad)?.name || ""
          : "",
        sadOkregowyId: sadOkregowyId,
        sadOkregowyNazwa:
          sadOkregowyId && apelacjaSad
            ? getDistrictCourt(apelacjaSad, sadOkregowyId)?.name || ""
            : "",
        sadRejonowyId: sadRejonowyId,
        sadRejonowyNazwa: sadRejonowyId
          ? dostepneSadyRejonowe.find((sad) => sad.id === sadRejonowyId)
              ?.name || ""
          : "",
        liczbaSedzi: liczbaSedzi,
        plecSedziego: plecSedziego,
        inicjalySedziego: inicjalySedziego,
        czyPozew: czyPozew,
        watekWiny: watekWiny,
      };

      // Walidacja za pomocą schematu Zod
      postepowanieSadoweSchema.parse(formDataToValidate);

      // Resetuj błędy jeśli walidacja przeszła poprawnie
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
  }, [
    ocenaAdekwatnosci,
    rokDecyzji,
    miesiacDecyzji,
    rodzajSadu,
    apelacjaSad,
    sadOkregowyId,
    sadRejonowyId,
    liczbaSedzi,
    plecSedziego,
    inicjalySedziego,
    czyPozew,
    watekWiny,
  ]);
  // Funkcja scrollToTop
  const scrollToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Funkcja obsługująca przejście do następnego kroku
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
    trackedLog(operationId, "Starting postepowanie sadowe form submission");

    try {
      // Walidacja danych formularza
      if (!validateForm()) {
        setIsSubmitting(false);
        scrollToTop();
        return;
      }

      // Przygotowanie danych do zapisania
      const postepowanieSadoweData: PostepowanieSadoweData = {
        ocenaAdekwatnosciSad: ocenaAdekwatnosci,
        wariantPostepu: "court",
        rokDecyzjiSad: rokDecyzji,
        miesiacDecyzjiSad: miesiacDecyzji,
        rodzajSaduSad: rodzajSadu,
        apelacjaSad: apelacjaSad,
        apelacjaId: apelacjaSad, // Dla kompatybilności z nowym schematem
        apelacjaNazwa: apelacjaSad
          ? getAppellation(apelacjaSad)?.name || ""
          : "",
        sadOkregowyId: sadOkregowyId,
        sadOkregowyNazwa:
          sadOkregowyId && apelacjaSad
            ? getDistrictCourt(apelacjaSad, sadOkregowyId)?.name || ""
            : "",
        sadRejonowyId: sadRejonowyId,
        sadRejonowyNazwa: sadRejonowyId
          ? dostepneSadyRejonowe.find((sad) => sad.id === sadRejonowyId)
              ?.name || ""
          : "",
        liczbaSedzi: liczbaSedzi,
        plecSedziego: plecSedziego,
        inicjalySedziego: inicjalySedziego,
        czyPozew: czyPozew,
        watekWiny: watekWiny,
      }; // Zapisywanie danych z mechanizmem ponownych prób
      await retryOperation(
        async () => {
          await updateFormData({
            ...postepowanieSadoweData,
            __meta: {
              lastUpdated: Date.now(),
              formVersion: "1.2.0",
              csrfToken: formData.__meta?.csrfToken,
            },
          });
          return true;
        },
        {
          maxAttempts: 3,
          delayMs: 300,
          operationName: "Update form data - postepowanie sadowe",
          operationId,
        }
      );

      // Zapisujemy informację o submisji formularza dla celów analizy
      recordSubmission();

      // Przewijamy stronę do góry przed przejściem do następnego kroku
      scrollToTop();

      // Dodajemy małe opóźnienie dla lepszego UX
      setTimeout(() => {
        trackedLog(operationId, "Navigating to informacje-o-tobie");
        router.push("/informacje-o-tobie");

        // Zmniejszamy szansę na back button lub podwójną submisję
        setTimeout(() => {
          setIsSubmitting(false);
        }, 500);
      }, 100);
    } catch (error) {
      trackedLog(
        operationId,
        "Error in postepowanie sadowe submission",
        error,
        "error"
      );
      setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      setIsSubmitting(false);
      scrollToTop();
    }
  }, [
    isSubmitting,
    validateForm,
    ocenaAdekwatnosci,
    rokDecyzji,
    miesiacDecyzji,
    rodzajSadu,
    apelacjaSad,
    sadOkregowyId,
    sadRejonowyId,
    liczbaSedzi,
    plecSedziego,
    inicjalySedziego,
    czyPozew,
    watekWiny,
    updateFormData,
    router,
    scrollToTop,
    dostepneSadyRejonowe,
    getAppellation,
    getDistrictCourt,
  ]);

  // Funkcja obsługująca powrót do poprzedniego kroku
  const handleBack = useCallback(async () => {
    // Zapobieganie wielokrotnym kliknięciom
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const operationId = generateOperationId();
    trackedLog(operationId, "Back navigation from postepowanie sadowe");

    try {
      // Zapisz bieżące dane przed cofnięciem
      const postepowanieSadoweData: PostepowanieSadoweData = {
        ocenaAdekwatnosciSad: ocenaAdekwatnosci,
        wariantPostepu: "court",
        rokDecyzjiSad: rokDecyzji,
        miesiacDecyzjiSad: miesiacDecyzji,
        rodzajSaduSad: rodzajSadu,
        apelacjaSad: apelacjaSad,
        apelacjaId: apelacjaSad, // Dla kompatybilności z nowym schematem
        apelacjaNazwa: apelacjaSad
          ? getAppellation(apelacjaSad)?.name || ""
          : "",
        sadOkregowyId: sadOkregowyId,
        sadOkregowyNazwa:
          sadOkregowyId && apelacjaSad
            ? getDistrictCourt(apelacjaSad, sadOkregowyId)?.name || ""
            : "",
        sadRejonowyId: sadRejonowyId,
        sadRejonowyNazwa: sadRejonowyId
          ? dostepneSadyRejonowe.find((sad) => sad.id === sadRejonowyId)
              ?.name || ""
          : "",
        liczbaSedzi: liczbaSedzi,
        plecSedziego: plecSedziego,
        inicjalySedziego: inicjalySedziego,
        czyPozew: czyPozew,
        watekWiny: watekWiny,
      };
      await updateFormData({
        ...postepowanieSadoweData,
        __meta: {
          lastUpdated: Date.now(),
          formVersion: "1.2.0",
          csrfToken: formData.__meta?.csrfToken,
        },
      });

      // Przewijamy stronę do góry przed przejściem do poprzedniej strony
      scrollToTop(); // Dodajemy małe opóźnienie dla lepszego UX
      setTimeout(() => {
        trackedLog(operationId, "Navigating back to dochody-i-koszty");
        router.push("/dochody-i-koszty");
        setIsSubmitting(false);
      }, 100);
    } catch (error) {
      trackedLog(operationId, "Error during back navigation", error, "error");
      setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      setIsSubmitting(false);
      scrollToTop();
    }
  }, [
    isSubmitting,
    ocenaAdekwatnosci,
    rokDecyzji,
    miesiacDecyzji,
    rodzajSadu,
    apelacjaSad,
    sadOkregowyId,
    sadRejonowyId,
    liczbaSedzi,
    plecSedziego,
    inicjalySedziego,
    czyPozew,
    watekWiny,
    updateFormData,
    router,
    scrollToTop,
    dostepneSadyRejonowe,
    getAppellation,
    getDistrictCourt,
  ]);

  // Funkcja do resetowania błędów dla danego pola
  const resetFieldError = useCallback(
    (fieldName: string) => {
      if (fieldErrors[fieldName]) {
        setFieldErrors((prev) => {
          const updated = { ...prev };
          delete updated[fieldName];
          return updated;
        });
      }
      if (error) setError(null);
    },
    [fieldErrors, error]
  );

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={9} totalSteps={12} />
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Informacje o postępowaniu sądowym
              </h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      W tej części zbieramy informacje o decyzji, która
                      określiła zasady finansowania potrzeb dziecka – może to
                      być wyrok, postanowienie zabezpieczające, ugoda lub inne
                      rozstrzygnięcie.
                    </p>
                    <p>
                      Chcemy lepiej zrozumieć kontekst tej decyzji – kiedy
                      zapadła, przez jaki sąd została wydana, w jakim składzie,
                      oraz jak oceniasz jej adekwatność względem rzeczywistości.
                    </p>
                  </div>
                }
              />
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-md">
                {error}
              </div>
            )}
            <p>
              W tej części zbieramy informacje o decyzji, która określiła zasady
              finansowania potrzeb dziecka – może to być wyrok, postanowienie
              zabezpieczające, ugoda lub inne rozstrzygnięcie.
            </p>
            <p>
              <strong>
                Chcemy lepiej zrozumieć kontekst tej decyzji – kiedy zapadła,
                przez jaki sąd została wydana, w jakim składzie, oraz jak
                oceniasz jej adekwatność względem rzeczywistości.
              </strong>{" "}
              Dzięki temu możliwe będzie trafniejsze porównanie Twojej sytuacji
              z innymi oraz lepsze uchwycenie różnic między praktyką różnych
              sądów.
            </p>
            <div className="space-y-4">
              {" "}
              <div>
                <Label className="block mb-2">
                  Rok i miesiąc decyzji lub zatwierdzenia porozumienia
                  <InfoTooltip
                    content={
                      <div className="text-sm">
                        <p>
                          Dzięki tej dacie system lepiej dopasuje porównania do
                          sytuacji rynkowej i orzeczniczej z tamtego okresu.
                        </p>
                      </div>
                    }
                  />
                </Label>{" "}
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Select
                      value={rokDecyzji}
                      onValueChange={(value) => {
                        setRokDecyzji(value);
                        resetFieldError("rokDecyzjiSad");
                      }}
                    >
                      <SelectTrigger
                        className={
                          fieldErrors["rokDecyzjiSad"] ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Wybierz rok" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors["rokDecyzjiSad"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {fieldErrors["rokDecyzjiSad"]}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Select
                      value={miesiacDecyzji}
                      onValueChange={(value) => {
                        setMiesiacDecyzji(value);
                        resetFieldError("miesiacDecyzjiSad");
                      }}
                    >
                      <SelectTrigger
                        className={
                          fieldErrors["miesiacDecyzjiSad"]
                            ? "border-red-500"
                            : ""
                        }
                      >
                        <SelectValue placeholder="Wybierz miesiąc" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Styczeń</SelectItem>
                        <SelectItem value="02">Luty</SelectItem>
                        <SelectItem value="03">Marzec</SelectItem>
                        <SelectItem value="04">Kwiecień</SelectItem>
                        <SelectItem value="05">Maj</SelectItem>
                        <SelectItem value="06">Czerwiec</SelectItem>
                        <SelectItem value="07">Lipiec</SelectItem>
                        <SelectItem value="08">Sierpień</SelectItem>
                        <SelectItem value="09">Wrzesień</SelectItem>
                        <SelectItem value="10">Październik</SelectItem>
                        <SelectItem value="11">Listopad</SelectItem>
                        <SelectItem value="12">Grudzień</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors["miesiacDecyzjiSad"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {fieldErrors["miesiacDecyzjiSad"]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-4">
                  📍 Sąd, który wydał decyzję dotyczącą alimentów
                </h3>

                <p className="mb-4 text-sm text-gray-700">
                  W Polsce decyzje alimentacyjne (np. w formie wyroku
                  rozwodowego, zabezpieczenia alimentów lub postanowienia w
                  sprawie rodzinnej) mogą być wydawane przez różne sądy – w
                  zależności od rodzaju sprawy. Aby właściwie przypisać Twoje
                  zgłoszenie do regionu i zapewnić wysoką jakość analizy danych,
                  prosimy o wskazanie:
                </p>

                <div className="space-y-6">
                  <div>
                    <Label className="block mb-2">
                      1. Rodzaju sądu, który wydał decyzję
                    </Label>
                    <p className="text-sm text-gray-600 mb-3">
                      Zaznacz, przez jaki sąd została wydana decyzja dotycząca
                      alimentów w Twojej sprawie:
                    </p>{" "}
                    <RadioGroup
                      value={rodzajSadu}
                      onValueChange={(value) => {
                        setRodzajSadu(value as RodzajSadu);
                        resetFieldError("rodzajSaduSad");

                        // Reset dependent fields when changing court type
                        if (value !== rodzajSadu) {
                          setApelacjaSad("");
                          setSadOkregowyId("");
                          setSadRejonowyId("");
                          resetFieldError("apelacjaSad");
                          resetFieldError("sadOkregowyId");
                          resetFieldError("sadRejonowyId");
                        }
                      }}
                      className={
                        fieldErrors["rodzajSaduSad"]
                          ? "border-red-500 p-2 rounded-md"
                          : ""
                      }
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="rejonowy" id="sad-rejonowy" />
                        <Label htmlFor="sad-rejonowy">Sąd rejonowy</Label>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem value="okregowy" id="sad-okregowy" />
                        <Label htmlFor="sad-okregowy">Sąd okręgowy</Label>
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <RadioGroupItem
                          value="nie_pamietam"
                          id="sad-nie-pamietam"
                        />
                        <Label htmlFor="sad-nie-pamietam">Nie pamiętam</Label>
                      </div>
                    </RadioGroup>
                    {fieldErrors["rodzajSaduSad"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {fieldErrors["rodzajSaduSad"]}
                      </p>
                    )}
                    <div className="mt-2 p-3 bg-blue-50 rounded-md">
                      <p className="text-sm text-blue-700 flex items-start">
                        <span className="text-blue-500 mr-2">ℹ️</span>
                        Jeśli nie masz pewności – najczęściej:
                        <br />- sprawy o zabezpieczenie alimentów prowadzi sąd
                        rejonowy,
                        <br />- sprawy rozwodowe (w tym wyrok alimentacyjny)
                        prowadzi sąd okręgowy.
                      </p>
                    </div>
                    <div className="mt-3">
                      <InfoTooltip
                        content={
                          <div className="text-sm space-y-2">
                            <p className="font-bold">Nie pamiętasz?</p>
                            <p>
                              Jeśli nie jesteś pewien, jak nazywał się sąd:
                              <br />- wybierz opcję „Nie pamiętam" i wpisz nazwę
                              miejscowości, w której toczyła się sprawa.
                              <br />- lub skorzystaj z zewnętrznej wyszukiwarki:
                            </p>
                            <a
                              href="https://www.gov.pl/web/sprawiedliwosc/struktura-sadow-powszechnych"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Sprawdź właściwość sądu dla miejscowości
                            </a>
                          </div>
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="block mb-2">2. Obszar apelacji</Label>
                    <p className="text-sm text-gray-600 mb-3">
                      Wybierz obszar apelacji, do którego należy sąd
                      rozpatrujący Twoją sprawę:
                    </p>{" "}
                    <Select
                      value={apelacjaSad}
                      onValueChange={(value) => {
                        setApelacjaSad(value);
                        setSadOkregowyId("");
                        setSadRejonowyId("");
                        resetFieldError("apelacjaSad");
                        resetFieldError("sadOkregowyId");
                        resetFieldError("sadRejonowyId");
                      }}
                      disabled={rodzajSadu === "nie_pamietam"}
                    >
                      <SelectTrigger
                        className={
                          fieldErrors["apelacjaSad"] ? "border-red-500" : ""
                        }
                      >
                        <SelectValue placeholder="Wybierz apelację" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPELATIONS.map((apelacja) => (
                          <SelectItem key={apelacja.id} value={apelacja.id}>
                            {apelacja.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldErrors["apelacjaSad"] && (
                      <p className="text-red-500 text-xs mt-1">
                        {fieldErrors["apelacjaSad"]}
                      </p>
                    )}
                  </div>

                  {apelacjaSad && (
                    <div>
                      <Label className="block mb-2">
                        3. Sąd, który wydał decyzję
                      </Label>
                      <p className="text-sm text-gray-600 mb-3">
                        {rodzajSadu === "rejonowy"
                          ? "Najpierw wskaż sąd okręgowy, a następnie sąd rejonowy podlegający pod ten okręg"
                          : "Wskaż sąd okręgowy z listy"}
                      </p>

                      {/* Wybór sądu okręgowego */}
                      <div className="mb-4">
                        {" "}
                        <Select
                          value={sadOkregowyId}
                          onValueChange={(value) => {
                            setSadOkregowyId(value);
                            setSadRejonowyId("");
                            resetFieldError("sadOkregowyId");
                            resetFieldError("sadRejonowyId");
                          }}
                        >
                          <SelectTrigger
                            className={
                              fieldErrors["sadOkregowyId"]
                                ? "border-red-500"
                                : ""
                            }
                          >
                            <SelectValue placeholder="Wybierz sąd okręgowy" />
                          </SelectTrigger>
                          <SelectContent>
                            {APPELATIONS.find(
                              (a) => a.id === apelacjaSad
                            )?.districtCourts.map((sad) => (
                              <SelectItem key={sad.id} value={sad.id}>
                                {sad.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors["sadOkregowyId"] && (
                          <p className="text-red-500 text-xs mt-1">
                            {fieldErrors["sadOkregowyId"]}
                          </p>
                        )}
                      </div>

                      {/* Wybór sądu rejonowego (tylko gdy wybrany sąd rejonowy) */}
                      {rodzajSadu === "rejonowy" && sadOkregowyId && (
                        <div className="mb-4">
                          {" "}
                          <Select
                            value={sadRejonowyId}
                            onValueChange={(value) => {
                              setSadRejonowyId(value);
                              resetFieldError("sadRejonowyId");
                            }}
                          >
                            <SelectTrigger
                              className={
                                fieldErrors["sadRejonowyId"]
                                  ? "border-red-500"
                                  : ""
                              }
                            >
                              <SelectValue placeholder="Wybierz sąd rejonowy" />
                            </SelectTrigger>
                            <SelectContent>
                              {dostepneSadyRejonowe.map((sad) => (
                                <SelectItem key={sad.id} value={sad.id}>
                                  {sad.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldErrors["sadRejonowyId"] && (
                            <p className="text-red-500 text-xs mt-1">
                              {fieldErrors["sadRejonowyId"]}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700 flex items-start">
                    <span className="mr-2">✅</span>
                    Dzięki tym informacjom Twój przypadek zostanie właściwie
                    przypisany regionalnie i uwzględniony w analizach, które
                    służą tworzeniu bardziej przejrzystego systemu
                    alimentacyjnego w Polsce.
                  </p>
                </div>

                <p className="text-sm text-gray-500 mt-3">
                  Pozwoli to na mapowanie lokalnych różnic w orzecznictwie.
                </p>
              </div>{" "}
              <div className="mt-8">
                <Label className="block mb-2">Skład orzekający</Label>
                <div className="space-y-3">
                  <Select
                    value={liczbaSedzi}
                    onValueChange={(val: "jeden" | "trzech") =>
                      setLiczbaSedzi(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Liczba sędziów" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jeden">1 sędzia</SelectItem>
                      <SelectItem value="trzech">3 sędziów</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={plecSedziego}
                    onValueChange={(val: "kobieta" | "mezczyzna") =>
                      setPlecSedziego(val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Płeć sędziego przewodniczącego" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kobieta">Kobieta</SelectItem>
                      <SelectItem value="mezczyzna">Mężczyzna</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="text"
                    placeholder="Inicjały sędziego prowadzącego (opcjonalnie)"
                    value={inicjalySedziego}
                    onChange={(e) => setInicjalySedziego(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6">
                <Label className="block mb-2">
                  Czy to Ty złożyłeś/łaś pozew?
                </Label>
                <RadioGroup
                  value={czyPozew}
                  onValueChange={(val: "tak" | "nie") => setCzyPozew(val)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tak" id="pozew-tak" />
                    <Label htmlFor="pozew-tak">Tak</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nie" id="pozew-nie" />
                    <Label htmlFor="pozew-nie">Nie</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="mt-6">
                <Label className="block mb-2">
                  Czy w pozwie pojawił się wątek winy?
                </Label>
                <RadioGroup
                  value={watekWiny}
                  onValueChange={(
                    val: "nie" | "tak-ja" | "tak-druga-strona" | "tak-oboje"
                  ) => setWatekWiny(val)}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="nie" id="wina-nie" />
                    <Label htmlFor="wina-nie">Nie</Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="tak-ja" id="wina-ja" />
                    <Label htmlFor="wina-ja">
                      Tak – domagałem/am się orzeczenia o winie
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="tak-druga-strona" id="wina-druga" />
                    <Label htmlFor="wina-druga">
                      Tak – druga strona domagała się orzeczenia o winie
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value="tak-oboje" id="wina-oboje" />
                    <Label htmlFor="wina-oboje">
                      Tak – oboje domagaliśmy się orzeczenia o winie
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="mt-8">
                <Label className="block mb-2">
                  Subiektywna ocena adekwatności decyzji sądu odnośnie wysokości
                  alimentów
                </Label>
                <div className="text-sm text-gray-600 mb-2">
                  Oceń w skali 1–5, gdzie 1 oznacza &ldquo;zupełnie
                  nieadekwatny&rdquo;, a 5 &ldquo;w pełni adekwatny&rdquo;
                </div>

                <InfoTooltip
                  content={
                    <div className="text-sm">
                      <p>
                        Ta odpowiedź nie wpływa na raport – służy do analizy
                        zbiorczej i identyfikacji potencjalnych schematów
                        orzeczniczych.
                      </p>
                    </div>
                  }
                />

                <div className="relative py-5">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      zupełnie nieadekwatny
                    </span>
                    <span className="text-sm text-gray-600">
                      w pełni adekwatny
                    </span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={ocenaAdekwatnosci}
                    onChange={(e) =>
                      setOcenaAdekwatnosci(parseInt(e.target.value))
                    }
                    className="w-full"
                  />

                  <div className="flex justify-center mt-4">
                    <span className="font-semibold text-lg">
                      Twoja ocena: {ocenaAdekwatnosci}
                    </span>
                  </div>
                </div>
              </div>
            </div>{" "}
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
              </Button>
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
