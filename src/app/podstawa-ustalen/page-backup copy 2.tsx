"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup } from "@/components/ui/radio-group";
import { ClickableRadioOption } from "@/components/ui/custom/ClickableRadioOption";
import { useFormStore } from "@/lib/store/form-store";
import { settlementBaseSchema } from "@/lib/schemas/settlement-base-schema";
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

export default function PodstawaUstalen() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();
  const secureStore = useFormStore();

  // CSRF token initialization
  const csrfInitialized = useRef(false);

  useEffect(() => {
    if (!csrfInitialized.current) {
      const token = generateCSRFToken();
      storeCSRFToken(token);
      secureStore.updateFormData({
        __meta: {
          csrfToken: token,
          lastUpdated: Date.now(),
          formVersion: "1.1.0",
        },
      });
      csrfInitialized.current = true;
    }
  }, []);

  // Funkcja scrollToTop dla lepszego UX przy przejściach
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Inicjalizacja stanu wybranej opcji z danych formularza (jeśli istnieją)
  const [selectedOption, setSelectedOption] = useState<string>(
    formData.podstawaUstalen || ""
  );

  // Stan dla pola "inne" szczegóły
  const [inneDetails, setInneDetails] = useState<string>(
    formData.podstawaUstalenInne || ""
  );

  // Stan błędu do walidacji
  const [error, setError] = useState<string | null>(null);

  // Stan przycisku do zapobiegania wielokrotnym kliknięciom
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Efekt do sprawdzania zależności i czyszczenia błędów
  useEffect(() => {
    if (selectedOption) {
      setError(null);
    }
  }, [selectedOption]);

  // Zabezpieczenie - sprawdzamy czy użytkownik przeszedł przez poprzednie kroki
  useEffect(() => {
    if (!formData.sciezkaWybor) {
      router.push("/sciezka");
      return;
    }

    if (!formData.sposobFinansowania) {
      router.push("/finansowanie");
      return;
    }
  }, [formData.sciezkaWybor, formData.sposobFinansowania, router]); // Funkcja do obsługi przejścia do następnego kroku
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
    trackedLog(operationId, "Starting settlement base form submission");

    setIsSubmitting(true);

    try {
      // Określamy kategorię podstawy ustaleń do użycia w kroku 9
      let wariantPostepu: "court" | "agreement" | "other" = "other"; // Domyślnie "inne"

      if (["zabezpieczenie", "wyrok", "ugoda-sad"].includes(selectedOption)) {
        wariantPostepu = "court"; // Wariant dla postępowania sądowego
      } else if (["mediacja", "prywatne"].includes(selectedOption)) {
        wariantPostepu = "agreement"; // Wariant dla porozumienia
      }

      // Walidacja danych przy użyciu schematu Zod
      trackedLog(operationId, "Validating form data", {
        podstawaUstalen: selectedOption,
        podstawaUstalenInne: selectedOption === "inne" ? inneDetails : "",
      });

      const validationResult = settlementBaseSchema.safeParse({
        podstawaUstalen: selectedOption,
        podstawaUstalenInne: selectedOption === "inne" ? inneDetails : "",
      });

      if (!validationResult.success) {
        // Obsługa błędów walidacji
        const formattedErrors = validationResult.error.format();
        let errorMessage: string;

        if (formattedErrors.podstawaUstalen?._errors?.length) {
          errorMessage = formattedErrors.podstawaUstalen._errors[0];
        } else if (formattedErrors.podstawaUstalenInne?._errors?.length) {
          errorMessage = formattedErrors.podstawaUstalenInne._errors[0];
        } else {
          errorMessage = "Proszę wypełnić wymagane pola";
        }

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
              podstawaUstalen: selectedOption,
              podstawaUstalenInne: selectedOption === "inne" ? inneDetails : "",
              wariantPostepu: wariantPostepu, // Zapisujemy kategorię do późniejszego użycia
              __meta: {
                lastUpdated: Date.now(),
                formVersion: "1.1.0",
              },
            });
            return true;
          },
          {
            operationId,
            operationName: "save_settlement_base",
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
            podstawaUstalen: selectedOption,
            podstawaUstalenInne: selectedOption === "inne" ? inneDetails : "",
            wariantPostepu: wariantPostepu,
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
      trackedLog(operationId, "Preparing navigation to /dzieci");

      await safeNavigate(
        () => router.push("/dzieci"),
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
  }, [
    selectedOption,
    inneDetails,
    isSubmitting,
    updateFormData,
    router,
    scrollToTop,
  ]);
  // Funkcja do obsługi powrotu do poprzedniego kroku
  const handleBack = useCallback(() => {
    const operationId = generateOperationId();
    trackedLog(operationId, "Navigating back to /finansowanie");

    // Używamy bezpiecznej nawigacji
    safeNavigate(
      () => router.push("/finansowanie"),
      () => scrollToTop(),
      100
    );
  }, [router, scrollToTop]);

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={3} totalSteps={12} />

          <div className="space-y-6 text-sky-950">
            <div className="flex items-start gap-2">
              <h1 className="text-2xl font-bold">
                Na jakiej podstawie zostały ustalone zasady finansowania potrzeb
                dziecka lub dzieci?
              </h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      Dlaczego o to pytamy? Typ ustaleń wpływa na trwałość i
                      pewność sytuacji prawnej.
                    </p>
                  </div>
                }
              />
            </div>
            <p>Wybierz opcję, która najlepiej oddaje Twoją sytuację.</p>{" "}
            <RadioGroup
              value={selectedOption}
              onValueChange={(value) => {
                setSelectedOption(value);
                if (value !== "inne") {
                  setInneDetails("");
                }
              }}
              className="space-y-3"
            >
              <ClickableRadioOption
                value="zabezpieczenie"
                id="zabezpieczenie"
                label="Postanowienie zabezpieczające"
                description="(tymczasowe ustalenie przez sąd – np. na czas trwania sprawy rozwodowej lub rodzinnej)"
                selected={selectedOption === "zabezpieczenie"}
              />
              <ClickableRadioOption
                value="wyrok"
                id="wyrok"
                label="Wyrok rozwodowy lub wyrok w innej sprawie rodzinnej"
                description="(ostateczne rozstrzygnięcie sądu o alimentach)"
                selected={selectedOption === "wyrok"}
              />
              <ClickableRadioOption
                value="ugoda-sad"
                id="ugoda-sad"
                label="Porozumienie rodzicielskie zatwierdzone przez sąd"
                description="(rodzice sami ustalili zasady, a sąd je zatwierdził i nadał im moc prawną)"
                selected={selectedOption === "ugoda-sad"}
              />
              <ClickableRadioOption
                value="mediacja"
                id="mediacja"
                label="Porozumienie mediacyjne"
                description="(ustalenia zawarte podczas mediacji – z lub bez późniejszego zatwierdzenia przez sąd)"
                selected={selectedOption === "mediacja"}
              />
              <ClickableRadioOption
                value="prywatne"
                id="prywatne"
                label="Prywatne porozumienie bez zatwierdzenia przez sąd"
                description="(uzgodnienia między rodzicami, bez formalnej akceptacji sądowej)"
                selected={selectedOption === "prywatne"}
              />
              <ClickableRadioOption
                value="inne"
                id="inne"
                label="Inne"
                hasInput={selectedOption === "inne"}
                inputValue={inneDetails}
                onInputChange={setInneDetails}
                inputPlaceholder="Prosimy o krótki opis"
                selected={selectedOption === "inne"}
              />{" "}
            </RadioGroup>
            {/* Wyświetlanie błędu walidacji */}
            {error && <p className="text-red-500 text-sm">{error}</p>}{" "}
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
