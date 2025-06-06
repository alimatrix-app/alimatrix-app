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
import { Loader2 } from "lucide-react";
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
import { dochodyIKosztySchema } from "@/lib/schemas/dochody-koszty-schema";

type DochodyRodzicow = {
  wlasne: {
    oficjalneDochodyNetto: number | "";
    potencjalDochodowy: number | "";
    kosztyUtrzymaniaSiebie: number | "";
    kosztyUtrzymaniaInnychOsob: number | "";
    dodatkoweZobowiazania: number | "";
  };
  drugiRodzic: {
    oficjalneDochodyNetto: number | "";
    potencjalDochodowy: number | "";
    kosztyUtrzymaniaSiebie: number | "";
    kosztyUtrzymaniaInnychOsob: number | "";
    dodatkoweZobowiazania: number | "";
  };
};

export default function DochodyIKoszty() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // CSRF token initialization - enhanced security
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

  // Inicjalizacja stanu dla danych o dochodach i kosztach
  const [dochodyRodzicow, setDochodyRodzicow] = useState<DochodyRodzicow>({
    wlasne: {
      oficjalneDochodyNetto: "",
      potencjalDochodowy: "",
      kosztyUtrzymaniaSiebie: "",
      kosztyUtrzymaniaInnychOsob: "",
      dodatkoweZobowiazania: "",
    },
    drugiRodzic: {
      oficjalneDochodyNetto: "",
      potencjalDochodowy: "",
      kosztyUtrzymaniaSiebie: "",
      kosztyUtrzymaniaInnychOsob: "",
      dodatkoweZobowiazania: "",
    },
  });

  // Stany dla obsługi błędów i procesu submisji
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Funkcja do przewijania strony do góry po akcjach
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Inicjalizacja danych z formularza, jeśli istnieją
  useEffect(() => {
    if (formData.dochodyRodzicow) {
      setDochodyRodzicow({
        wlasne: {
          oficjalneDochodyNetto:
            formData.dochodyRodzicow.wlasne.oficjalneDochodyNetto || "",
          potencjalDochodowy:
            formData.dochodyRodzicow.wlasne.potencjalDochodowy || "",
          kosztyUtrzymaniaSiebie:
            formData.dochodyRodzicow.wlasne.kosztyUtrzymaniaSiebie || "",
          kosztyUtrzymaniaInnychOsob:
            formData.dochodyRodzicow.wlasne.kosztyUtrzymaniaInnychOsob || "",
          dodatkoweZobowiazania:
            formData.dochodyRodzicow.wlasne.dodatkoweZobowiazania || "",
        },
        drugiRodzic: {
          oficjalneDochodyNetto:
            formData.dochodyRodzicow.drugiRodzic.oficjalneDochodyNetto || "",
          potencjalDochodowy:
            formData.dochodyRodzicow.drugiRodzic.potencjalDochodowy || "",
          kosztyUtrzymaniaSiebie:
            formData.dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaSiebie || "",
          kosztyUtrzymaniaInnychOsob:
            formData.dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaInnychOsob ||
            "",
          dodatkoweZobowiazania:
            formData.dochodyRodzicow.drugiRodzic.dodatkoweZobowiazania || "",
        },
      });
    }
  }, [formData.dochodyRodzicow]);
  // Funkcja do aktualizacji danych o własnych dochodach i kosztach
  const updateWlasneDochodyKoszty = (
    field: keyof DochodyRodzicow["wlasne"],
    value: number | ""
  ) => {
    setDochodyRodzicow((prev) => ({
      ...prev,
      wlasne: {
        ...prev.wlasne,
        [field]: value,
      },
    }));

    // Reset błędów dla tego pola
    if (fieldErrors[`wlasne.${field}`]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[`wlasne.${field}`];
        return updated;
      });
    }
    setError(null);
  };

  // Funkcja do aktualizacji danych o dochodach i kosztach drugiego rodzica
  const updateDrugiRodzicDochodyKoszty = (
    field: keyof DochodyRodzicow["drugiRodzic"],
    value: number | ""
  ) => {
    setDochodyRodzicow((prev) => ({
      ...prev,
      drugiRodzic: {
        ...prev.drugiRodzic,
        [field]: value,
      },
    }));

    // Reset błędów dla tego pola
    if (fieldErrors[`drugiRodzic.${field}`]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[`drugiRodzic.${field}`];
        return updated;
      });
    }
    setError(null);
  };

  // Walidacja formularza przy użyciu schematu Zod
  const validateForm = useCallback(() => {
    try {
      dochodyIKosztySchema.parse(dochodyRodzicow);
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
        setError(
          "Wypełnij wszystkie wymagane pola (dochody netto i koszty utrzymania siebie)"
        );
      }
      return false;
    }
  }, [dochodyRodzicow]);
  // Funkcja do obsługi przejścia do następnego kroku
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
    trackedLog(operationId, "Starting dochody i koszty form submission");

    try {
      // Walidacja danych formularza używając Zod
      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      // Przygotowanie danych do zapisania w store
      const dochodyDoZapisu = {
        wlasne: {
          oficjalneDochodyNetto:
            typeof dochodyRodzicow.wlasne.oficjalneDochodyNetto === "number"
              ? dochodyRodzicow.wlasne.oficjalneDochodyNetto
              : 0,
          potencjalDochodowy:
            typeof dochodyRodzicow.wlasne.potencjalDochodowy === "number"
              ? dochodyRodzicow.wlasne.potencjalDochodowy
              : 0,
          kosztyUtrzymaniaSiebie:
            typeof dochodyRodzicow.wlasne.kosztyUtrzymaniaSiebie === "number"
              ? dochodyRodzicow.wlasne.kosztyUtrzymaniaSiebie
              : 0,
          kosztyUtrzymaniaInnychOsob:
            typeof dochodyRodzicow.wlasne.kosztyUtrzymaniaInnychOsob ===
            "number"
              ? dochodyRodzicow.wlasne.kosztyUtrzymaniaInnychOsob
              : 0,
          dodatkoweZobowiazania:
            typeof dochodyRodzicow.wlasne.dodatkoweZobowiazania === "number"
              ? dochodyRodzicow.wlasne.dodatkoweZobowiazania
              : 0,
        },
        drugiRodzic: {
          oficjalneDochodyNetto:
            typeof dochodyRodzicow.drugiRodzic.oficjalneDochodyNetto ===
            "number"
              ? dochodyRodzicow.drugiRodzic.oficjalneDochodyNetto
              : 0,
          potencjalDochodowy:
            typeof dochodyRodzicow.drugiRodzic.potencjalDochodowy === "number"
              ? dochodyRodzicow.drugiRodzic.potencjalDochodowy
              : 0,
          kosztyUtrzymaniaSiebie:
            typeof dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaSiebie ===
            "number"
              ? dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaSiebie
              : 0,
          kosztyUtrzymaniaInnychOsob:
            typeof dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaInnychOsob ===
            "number"
              ? dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaInnychOsob
              : 0,
          dodatkoweZobowiazania:
            typeof dochodyRodzicow.drugiRodzic.dodatkoweZobowiazania ===
            "number"
              ? dochodyRodzicow.drugiRodzic.dodatkoweZobowiazania
              : 0,
        },
      };

      // Zapisz dane z mechanizmem ponownych prób
      await retryOperation(
        async () => {
          await updateFormData({
            dochodyRodzicow: dochodyDoZapisu,
            __meta: {
              lastUpdated: Date.now(),
              formVersion: "1.2.0",
            },
          });
          return true;
        },
        {
          maxAttempts: 3,
          delayMs: 300,
          operationName: "Update form data - dochody i koszty",
          operationId,
        }
      );

      // Zapisujemy informację o submisji formularza dla celów analizy
      recordSubmission();

      // Przewijamy stronę do góry przed przejściem do następnej strony
      scrollToTop();

      // Dodajemy małe opóźnienie dla lepszego UX
      setTimeout(() => {
        trackedLog(operationId, "Navigating to postepowanie");
        router.push("/postepowanie");

        // Zmniejszamy szansę na back button lub podwójną submisję
        setTimeout(() => {
          setIsSubmitting(false);
        }, 500);
      }, 100);
    } catch (error) {
      trackedLog(operationId, "Error saving dochody i koszty data", "error");
      setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      setIsSubmitting(false);
    }
  }, [
    isSubmitting,
    dochodyRodzicow,
    validateForm,
    updateFormData,
    router,
    scrollToTop,
  ]);

  // Funkcja do obsługi powrotu do poprzedniego kroku
  const handleBack = useCallback(async () => {
    // Zapobieganie wielokrotnym kliknięciom
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const operationId = generateOperationId();
    trackedLog(operationId, "Back navigation from dochody i koszty");

    try {
      // Zapisujemy obecny stan formularza przed przejściem wstecz
      const dochodyDoZapisu = {
        wlasne: {
          oficjalneDochodyNetto:
            typeof dochodyRodzicow.wlasne.oficjalneDochodyNetto === "number"
              ? dochodyRodzicow.wlasne.oficjalneDochodyNetto
              : 0,
          potencjalDochodowy:
            typeof dochodyRodzicow.wlasne.potencjalDochodowy === "number"
              ? dochodyRodzicow.wlasne.potencjalDochodowy
              : 0,
          kosztyUtrzymaniaSiebie:
            typeof dochodyRodzicow.wlasne.kosztyUtrzymaniaSiebie === "number"
              ? dochodyRodzicow.wlasne.kosztyUtrzymaniaSiebie
              : 0,
          kosztyUtrzymaniaInnychOsob:
            typeof dochodyRodzicow.wlasne.kosztyUtrzymaniaInnychOsob ===
            "number"
              ? dochodyRodzicow.wlasne.kosztyUtrzymaniaInnychOsob
              : 0,
          dodatkoweZobowiazania:
            typeof dochodyRodzicow.wlasne.dodatkoweZobowiazania === "number"
              ? dochodyRodzicow.wlasne.dodatkoweZobowiazania
              : 0,
        },
        drugiRodzic: {
          oficjalneDochodyNetto:
            typeof dochodyRodzicow.drugiRodzic.oficjalneDochodyNetto ===
            "number"
              ? dochodyRodzicow.drugiRodzic.oficjalneDochodyNetto
              : 0,
          potencjalDochodowy:
            typeof dochodyRodzicow.drugiRodzic.potencjalDochodowy === "number"
              ? dochodyRodzicow.drugiRodzic.potencjalDochodowy
              : 0,
          kosztyUtrzymaniaSiebie:
            typeof dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaSiebie ===
            "number"
              ? dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaSiebie
              : 0,
          kosztyUtrzymaniaInnychOsob:
            typeof dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaInnychOsob ===
            "number"
              ? dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaInnychOsob
              : 0,
          dodatkoweZobowiazania:
            typeof dochodyRodzicow.drugiRodzic.dodatkoweZobowiazania ===
            "number"
              ? dochodyRodzicow.drugiRodzic.dodatkoweZobowiazania
              : 0,
        },
      };

      await updateFormData({
        dochodyRodzicow: dochodyDoZapisu,
        __meta: {
          lastUpdated: Date.now(),
          formVersion: "1.2.0",
        },
      });

      // Przewijamy stronę do góry przed przejściem do poprzedniej strony
      scrollToTop();

      // Dodajemy małe opóźnienie dla lepszego UX
      setTimeout(() => {
        trackedLog(operationId, "Navigating back to koszty-utrzymania");
        router.push("/koszty-utrzymania");
        setIsSubmitting(false);
      }, 100);
    } catch (error) {
      trackedLog(operationId, "Error during back navigation", "error");
      setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      setIsSubmitting(false);
    }
  }, [isSubmitting, dochodyRodzicow, updateFormData, router, scrollToTop]);

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={8} totalSteps={12} />
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Dochody i koszty życia rodziców
              </h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      To nie test ani osąd – to analiza, która ma pomóc lepiej
                      zrozumieć sytuację.
                    </p>
                    <p>
                      Im dokładniejsze będą Twoje dane, tym trafniejszy będzie
                      raport.
                    </p>
                  </div>
                }
              />
            </div>
            <div className="space-y-2 mb-4">
              <p className="font-bold">
                To nie test ani osąd – to analiza, która ma pomóc lepiej
                zrozumieć sytuację.
              </p>
              <p>
                Im dokładniejsze będą Twoje dane, tym trafniejszy będzie raport
                – zarówno dla Ciebie, jak i innych osób w podobnej sytuacji.
              </p>
              <p>
                Zadbaliśmy o to, żeby pytania były zrozumiałe, a formularz
                prowadził Cię krok po kroku. Dla wielu osób ta część formularza
                bywa też momentem refleksji nad tym, jak naprawdę wygląda ich
                codzienność finansowa.
              </p>
            </div>
            {/* Twoje dochody */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Twoje dochody</h3>
              <div className="space-y-4">
                {" "}
                <div>
                  <Label htmlFor="oficjalne-dochody" className="flex gap-1">
                    Oficjalne dochody netto (miesięcznie){" "}
                    <span className="text-red-500">*</span>
                    <InfoTooltip
                      content={
                        <p className="text-sm">
                          Podaj średnią miesięczną kwotę netto z ostatnich 12
                          miesięcy przed ustanowieniem alimentów.
                        </p>
                      }
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Podaj swoje oficjalne dochody netto z ostatnich 12 miesięcy
                    PRZED ustanowieniem alimentów – średnią miesięczną kwotę,
                    obejmującą: wynagrodzenia z umów o pracę, zlecenie, dzieło;
                    przychody z działalności gospodarczej; inne powtarzalne
                    źródła dochodu. Uwaga: Jeśli Twoje dochody są sezonowe,
                    prosimy o podanie uśrednionej wartości miesięcznej.
                  </p>
                  <Input
                    id="oficjalne-dochody"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0 zł"
                    value={dochodyRodzicow.wlasne.oficjalneDochodyNetto}
                    onChange={(e) =>
                      updateWlasneDochodyKoszty(
                        "oficjalneDochodyNetto",
                        e.target.value ? parseFloat(e.target.value) : ""
                      )
                    }
                    className={`mt-1 ${
                      fieldErrors["wlasne.oficjalneDochodyNetto"]
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  {fieldErrors["wlasne.oficjalneDochodyNetto"] && (
                    <p className="text-red-500 text-xs mt-1">
                      {fieldErrors["wlasne.oficjalneDochodyNetto"]}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="potencjal-dochodowy" className="flex gap-1">
                    Potencjał dochodowy (miesięcznie)
                    <InfoTooltip
                      content={
                        <p className="text-sm">
                          Jeśli prowadzisz działalność i część kosztów firmowych
                          (np. leasing, paliwo, telefon) dotyczy także życia
                          prywatnego – oszacuj ich wartość i uwzględnij
                          proporcjonalnie w swoich kosztach życia, a nie jako
                          czystą stratę firmową.
                        </p>
                      }
                    />
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Nie zawsze dochody pokazują pełen obraz. Sąd – a my w
                    raporcie również – bierze pod uwagę Twoje możliwości
                    zarobkowe. W tej części prosimy o oszacowanie: ile realnie
                    mógłbyś/mogłabyś zarabiać przy uwzględnieniu Twojego
                    wykształcenia, doświadczenia, branży, dostępności ofert
                    pracy.
                  </p>
                  <Input
                    id="potencjal-dochodowy"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0 zł"
                    value={dochodyRodzicow.wlasne.potencjalDochodowy}
                    onChange={(e) =>
                      updateWlasneDochodyKoszty(
                        "potencjalDochodowy",
                        e.target.value ? parseFloat(e.target.value) : ""
                      )
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            {/* Twoje koszty życia */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">
                Twoje koszty życia i zobowiązania
              </h3>
              <div className="space-y-4">
                {" "}
                <div>
                  <Label htmlFor="koszty-utrzymania-siebie">
                    Koszty utrzymania siebie (miesięcznie){" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Podaj kwotę miesięcznych wydatków na: żywność, mieszkanie,
                    media, transport, leki, ubezpieczenia, inne stałe koszty
                    związane z codziennym funkcjonowaniem.
                  </p>
                  <Input
                    id="koszty-utrzymania-siebie"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0 zł"
                    value={dochodyRodzicow.wlasne.kosztyUtrzymaniaSiebie}
                    onChange={(e) =>
                      updateWlasneDochodyKoszty(
                        "kosztyUtrzymaniaSiebie",
                        e.target.value ? parseFloat(e.target.value) : ""
                      )
                    }
                    className={`mt-1 ${
                      fieldErrors["wlasne.kosztyUtrzymaniaSiebie"]
                        ? "border-red-500"
                        : ""
                    }`}
                  />
                  {fieldErrors["wlasne.kosztyUtrzymaniaSiebie"] && (
                    <p className="text-red-500 text-xs mt-1">
                      {fieldErrors["wlasne.kosztyUtrzymaniaSiebie"]}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="koszty-utrzymania-innych">
                    Koszty utrzymania innych osób (miesięcznie)
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Jeśli wspierasz finansowo inne osoby (np. dzieci z innego
                    związku, partnera/partnerkę, rodziców), wskaż ich łączny
                    koszt miesięczny.
                  </p>
                  <Input
                    id="koszty-utrzymania-innych"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0 zł"
                    value={dochodyRodzicow.wlasne.kosztyUtrzymaniaInnychOsob}
                    onChange={(e) =>
                      updateWlasneDochodyKoszty(
                        "kosztyUtrzymaniaInnychOsob",
                        e.target.value ? parseFloat(e.target.value) : ""
                      )
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dodatkowe-zobowiazania">
                    Dodatkowe zobowiązania (miesięcznie)
                  </Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Podaj wysokość wszystkich miesięcznych obciążeń finansowych:
                    kredyty, raty, pożyczki, alimenty na inne dzieci, inne
                    regularne płatności (np. windykacje, kary umowne).
                  </p>
                  <Input
                    id="dodatkowe-zobowiazania"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0 zł"
                    value={dochodyRodzicow.wlasne.dodatkoweZobowiazania}
                    onChange={(e) =>
                      updateWlasneDochodyKoszty(
                        "dodatkoweZobowiazania",
                        e.target.value ? parseFloat(e.target.value) : ""
                      )
                    }
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  Uwaga techniczna: Nie uwzględniaj tych samych kosztów dwa razy
                  – np. jeśli leasing pojazdu rozliczasz w firmie, nie wpisuj go
                  ponownie jako koszt życia osobistego.
                </p>
              </div>
            </div>
            {/* Dochody i koszty drugiego rodzica */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">
                Dochody i koszty drugiego rodzica
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Jeśli posiadasz informacje na temat sytuacji drugiego rodzica,
                podaj je w analogiczny sposób. Nie masz pewności? Pozostaw pola
                liczbowe puste – formularz nadal zostanie prawidłowo
                przetworzony.
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-semibold mt-4 mb-2 text-gray-800">
                    Dochody drugiego rodzica
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="oficjalne-dochody-dr">
                        Oficjalne dochody netto drugiego rodzica
                      </Label>
                      <p className="text-xs text-gray-500 mb-2">
                        Średnia miesięczna kwota.
                      </p>
                      <Input
                        id="oficjalne-dochody-dr"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0 zł lub pozostaw puste"
                        value={
                          dochodyRodzicow.drugiRodzic.oficjalneDochodyNetto
                        }
                        onChange={(e) =>
                          updateDrugiRodzicDochodyKoszty(
                            "oficjalneDochodyNetto",
                            e.target.value ? parseFloat(e.target.value) : ""
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="potencjal-dochodowy-dr">
                        Potencjał dochodowy drugiego rodzica (miesięcznie)
                      </Label>
                      <p className="text-xs text-gray-500 mb-2">
                        Oszacowanie możliwości zarobkowych.
                      </p>
                      <Input
                        id="potencjal-dochodowy-dr"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0 zł lub pozostaw puste"
                        value={dochodyRodzicow.drugiRodzic.potencjalDochodowy}
                        onChange={(e) =>
                          updateDrugiRodzicDochodyKoszty(
                            "potencjalDochodowy",
                            e.target.value ? parseFloat(e.target.value) : ""
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-md font-semibold mt-6 mb-2 text-gray-800">
                    Koszty życia i zobowiązania drugiego rodzica
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="koszty-utrzymania-siebie-dr">
                        Koszty utrzymania siebie drugiego rodzica (miesięcznie)
                      </Label>
                      <Input
                        id="koszty-utrzymania-siebie-dr"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0 zł lub pozostaw puste"
                        value={
                          dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaSiebie
                        }
                        onChange={(e) =>
                          updateDrugiRodzicDochodyKoszty(
                            "kosztyUtrzymaniaSiebie",
                            e.target.value ? parseFloat(e.target.value) : ""
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="koszty-utrzymania-innych-dr">
                        Koszty utrzymania innych osób przez drugiego rodzica
                        (miesięcznie)
                      </Label>
                      <Input
                        id="koszty-utrzymania-innych-dr"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0 zł lub pozostaw puste"
                        value={
                          dochodyRodzicow.drugiRodzic.kosztyUtrzymaniaInnychOsob
                        }
                        onChange={(e) =>
                          updateDrugiRodzicDochodyKoszty(
                            "kosztyUtrzymaniaInnychOsob",
                            e.target.value ? parseFloat(e.target.value) : ""
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dodatkowe-zobowiazania-dr">
                        Dodatkowe zobowiązania drugiego rodzica (miesięcznie)
                      </Label>
                      <Input
                        id="dodatkowe-zobowiazania-dr"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0 zł lub pozostaw puste"
                        value={
                          dochodyRodzicow.drugiRodzic.dodatkoweZobowiazania
                        }
                        onChange={(e) =>
                          updateDrugiRodzicDochodyKoszty(
                            "dodatkoweZobowiazania",
                            e.target.value ? parseFloat(e.target.value) : ""
                          )
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Wyświetlanie błędu walidacji */}
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
