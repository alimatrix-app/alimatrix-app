"use client";

import { useState, useEffect, useCallback, memo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { ClickableRadioOption } from "@/components/ui/custom/ClickableRadioOption";
import { useFormStore } from "@/lib/store/form-store";
import { useSecureFormStore } from "@/lib/store/secure-form-store";
import { financingMethodSchema } from "@/lib/schemas/financing-schema";
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

// Memoizowany komponent opisu pytania
const FinancingQuestion = memo(() => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-bold">
        Sposób finansowania potrzeb dziecka
      </h1>
      <InfoTooltip
        content={
          <div className="space-y-2 text-sm">
            <p>
              Pytamy o główne zasady finansowania potrzeb dziecka lub dzieci.
              Wiemy, że w praktyce sytuacje bywają różne – ale ważne, żeby
              istniał ustalony sposób dzielenia się kosztami, nawet nieformalny.
            </p>
          </div>
        }
      />
    </div>
    <p className="text-bold">
      Jak w Twojej sytuacji wygląda obecnie główne ustalenie dotyczące
      finansowania potrzeb dziecka lub dzieci?
    </p>
    <p>
      (jeśli masz więcej niż jedno dziecko, odpowiedz ogólnie – w kolejnych
      pytaniach będzie miejsce na szczegóły)
    </p>
    <p className="font-semibold mb-2">
      Wybierz opcję, która najlepiej oddaje Twoją sytuację:{" "}
    </p>
    <InfoTooltip
      content={
        <div className="space-y-2 text-sm">
          <p>
            Twoja odpowiedź pomoże dostosować dalsze pytania w formularzu do
            Twojej sytuacji. Dzięki temu raport, który otrzymasz, będzie lepiej
            odzwierciedlał Twoją rzeczywistość.
          </p>
        </div>
      }
    />
  </div>
));

FinancingQuestion.displayName = "FinancingQuestion";

export default function Finansowanie() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();
  const secureStore = useSecureFormStore(); // CSRF token initialization
  const csrfInitialized = useRef(false);

  useEffect(() => {
    if (!csrfInitialized.current) {
      const token = generateCSRFToken();
      storeCSRFToken(token);
      secureStore.setMetaData({ csrfToken: token });
      csrfInitialized.current = true;
    }
  }, []); // Pusta tablica zależności - efekt wykonuje się tylko raz

  // Funkcja scrollToTop zaimplementowana bezpośrednio w komponencie
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Inicjalizacja stanu wybranej opcji z danych formularza (jeśli istnieją)
  const [selectedOption, setSelectedOption] = useState<string>(
    formData.sposobFinansowania || ""
  );

  // Stan błędu do walidacji
  const [error, setError] = useState<string | null>(null);

  // Stan przycisku do zapobiegania wielokrotnym kliknięciom
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Efekt do sprawdzania zależności
  useEffect(() => {
    if (selectedOption) {
      setError(null);
    }
  }, [selectedOption]);

  // Zabezpieczenie - sprawdzamy czy użytkownik przeszedł przez wybór ścieżki
  useEffect(() => {
    if (!formData.sciezkaWybor) {
      router.push("/sciezka");
    }
  }, [formData.sciezkaWybor, router]);

  // Handler zmiany opcji (memoizowany dla wydajności)
  const handleOptionChange = useCallback((value: string) => {
    setSelectedOption(value);
  }, []);
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
    trackedLog(operationId, "Starting financing form submission");

    setIsSubmitting(true);

    try {
      // Walidacja danych przy użyciu schematu Zod
      trackedLog(operationId, "Validating form data", {
        sposobFinansowania: selectedOption,
      });
      const validationResult = financingMethodSchema.safeParse({
        sposobFinansowania: selectedOption,
      });

      if (!validationResult.success) {
        // Obsługa błędów walidacji
        const formattedErrors = validationResult.error.format();
        const errorMessage =
          formattedErrors._errors?.[0] || "Proszę wybrać jedną z opcji";
        trackedLog(operationId, "Validation failed", errorMessage, "warn");
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      trackedLog(operationId, "Validation successful, proceeding to save data");

      // Zapisujemy wybrane dane do store'a wykorzystując mechanizm ponownych prób
      try {
        // Używamy ulepszonej funkcji retryOperation dla bezpiecznego zapisu danych
        await retryOperation(
          async () => {
            await updateFormData({
              sposobFinansowania: selectedOption as
                | "i-pay"
                | "i-receive"
                | "shared",
              __meta: {
                lastUpdated: Date.now(),
                formVersion: "1.1.0",
              },
            });
            return true;
          },
          {
            operationId,
            operationName: "save_financing_method",
            maxAttempts: 3,
            delayMs: 100,
            exponentialBackoff: true,
          }
        );

        // Zapisz datę ostatniej akcji
        recordSubmission();
        trackedLog(
          operationId,
          "Data saved successfully and submission recorded"
        );

        // Przewijamy stronę do góry przed przejściem do następnej strony
        scrollToTop();
        trackedLog(operationId, "Page scrolled to top");
      } catch (updateError) {
        trackedLog(
          operationId,
          "Error saving data after retries",
          updateError,
          "error"
        );

        // Ostatnia rozpaczliwa próba prostszego zapisu
        try {
          trackedLog(operationId, "Attempting simplified backup save");
          await updateFormData({
            sposobFinansowania: selectedOption as
              | "i-pay"
              | "i-receive"
              | "shared",
          });
          trackedLog(operationId, "Backup save succeeded");
          recordSubmission();
          scrollToTop();
        } catch (finalError) {
          trackedLog(
            operationId,
            "Even backup save failed",
            finalError,
            "error"
          );
          throw finalError;
        }
      }

      // Przekierowanie z bezpieczną nawigacją
      trackedLog(operationId, "Preparing navigation to /podstawa-ustalen");

      await safeNavigate(
        () => router.push("/podstawa-ustalen"),
        () => scrollToTop(),
        150
      );
    } catch (err) {
      trackedLog(
        operationId,
        "Critical error during form submission",
        err,
        "error"
      );
      setError("Wystąpił błąd podczas zapisywania wyboru. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
      trackedLog(operationId, "Form submission process completed");
    }
  }, [selectedOption, isSubmitting, updateFormData, router, scrollToTop]);
  // Funkcja do obsługi powrotu do poprzedniego kroku
  const handleBack = useCallback(() => {
    const operationId = generateOperationId();
    trackedLog(operationId, "Navigating back to /sciezka");

    // Używamy bezpiecznej nawigacji
    safeNavigate(
      () => router.push("/sciezka"),
      () => scrollToTop(),
      100
    );
  }, [scrollToTop, router]);

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={2} totalSteps={12} />

          <div className="space-y-6">
            <FinancingQuestion />

            <RadioGroup
              value={selectedOption}
              onValueChange={handleOptionChange}
              className="space-y-3"
            >
              <ClickableRadioOption
                value="i-pay"
                id="i-pay"
                label="Ja regularnie przekazuję środki na utrzymanie dziecka/dzieci drugiemu rodzicowi"
                description="(np. alimenty lub inne uzgodnienia – niezależnie od tego, czy ponoszę jeszcze inne koszty podczas opieki.)"
                selected={selectedOption === "i-pay"}
              />
              <ClickableRadioOption
                value="i-receive"
                id="i-receive"
                label="Drugi rodzic regularnie przekazuje środki na utrzymanie dziecka/dzieci mi"
                description="(nawet jeśli także sam pokrywa niektóre koszty podczas swojej opieki.)"
                selected={selectedOption === "i-receive"}
              />
              <ClickableRadioOption
                value="shared"
                id="shared"
                label="Koszty utrzymania dzieci dzielimy w miarę proporcjonalnie, bez systematycznego i formalnego przekazywania pieniędzy między sobą"
                description="(Każdy rodzic pokrywa swoje wydatki bezpośrednio lub finansujemy wspólnie w określony sposób.)"
                selected={selectedOption === "shared"}
              />
            </RadioGroup>

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
                className={`flex-1 ${
                  isSubmitting ? "opacity-80 cursor-not-allowed" : ""
                }`}
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Przetwarzanie...
                  </span>
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
