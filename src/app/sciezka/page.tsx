"use client";

import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";

import { useFormStore } from "@/lib/store/form-store";
import { useSecureFormStore } from "@/lib/store/secure-form-store";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, memo, useRef } from "react";
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
import { pathSelectionSchema } from "@/lib/schemas/paths-schema";

// Memoizowany komponent opcji wyboru
const PathOption = memo(
  ({
    id,
    isSelected,
    onSelect,
    title,
    tooltipContent,
    description,
    callToAction,
  }: {
    id: string;
    isSelected: boolean;
    onSelect: (id: string) => void;
    title: string;
    tooltipContent: React.ReactNode;
    description: string;
    callToAction: string;
  }) => (
    <div
      className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? "border-sky-950 bg-sky-50"
          : "border-gray-200 hover:border-blue-300"
      }`}
      onClick={() => onSelect(id)}
    >
      <Checkbox
        id={id}
        checked={isSelected}
        onCheckedChange={() => onSelect(id)}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center">
          <label htmlFor={id} className="font-medium cursor-pointer">
            {title}
          </label>
          <InfoTooltip content={tooltipContent} />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {description}
          <span className="block mt-1 text-sky-950 font-semibold">
            {callToAction}
          </span>
        </p>
      </div>
    </div>
  )
);

PathOption.displayName = "PathOption";

export default function WyborSciezki() {
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
  }, []);

  // Inicjalizacja stanu wybranej opcji z danych formularza (jeśli istnieją)
  const [selectedOption, setSelectedOption] = useState<string | null>(
    (formData.sciezkaWybor as string) || null
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

  // Handler wyboru opcji (memoizowany dla wydajności)
  const handleOptionSelect = useCallback((optionId: string) => {
    setSelectedOption(optionId);
    setError(null);
  }, []); // Funkcja do obsługi przejścia do następnego kroku
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
    trackedLog(operationId, "Starting form submission process");

    setIsSubmitting(true);

    try {
      // Walidacja danych przy użyciu schematu Zod
      trackedLog(operationId, "Validating form data", {
        sciezkaWybor: selectedOption,
      });
      const validationResult = pathSelectionSchema.safeParse({
        sciezkaWybor: selectedOption,
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

      // Zapisujemy wybraną ścieżkę do store'a wykorzystując mechanizm ponownych prób
      try {
        // Używamy ulepszonej funkcji retryOperation dla bezpiecznego zapisu danych
        await retryOperation(
          async () => {
            await updateFormData({
              sciezkaWybor: selectedOption as "established" | "not-established",
              __meta: {
                lastUpdated: Date.now(),
                formVersion: "1.1.0",
              },
            });
            return true;
          },
          {
            operationId,
            operationName: "save_path_selection",
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
            sciezkaWybor: selectedOption as "established" | "not-established",
          });
          trackedLog(operationId, "Backup save succeeded");
          recordSubmission();
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
      trackedLog(
        operationId,
        "Preparing navigation based on selection",
        selectedOption
      );

      if (selectedOption === "established") {
        await safeNavigate(() => router.push("/finansowanie"), undefined, 150);
      } else {
        await safeNavigate(() => router.push("/alternatywna"), undefined, 150);
      }
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
  }, [selectedOption, isSubmitting, router, updateFormData]);

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={1} totalSteps={12} />
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-left text-sky-950">
                Na jakim etapie ustaleń dotyczących finansowania potrzeb dziecka
                lub dzieci jesteś?
              </h1>
              <p className="text-text-sky-950">
                Zanim przejdziesz dalej, prosimy odpowiedz na jedno pytanie:
              </p>
              <p className="text-text-sky-950 font-bold">
                Czy w Twojej sytuacji zostało już ustalone, w jaki sposób
                dzielicie się z drugim rodzicem kosztami wychowania dziecka lub
                dzieci?
              </p>

              <div className="mt-2 text-sm text-sky-950 bg-gray-50 p-3 rounded-md">
                <p>Takie ustalenia mogą przyjmować różne formy:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>
                    orzeczenie sądu (np. postanowienie zabezpieczające, wyrok
                    rozwodowy),
                  </li>
                  <li>ugoda zawarta przed sądem lub mediatorem,</li>
                  <li>prywatne porozumienie między rodzicami,</li>
                  <li>
                    współmierne dzielenie się kosztami, bez formalnych
                    przelewów.
                  </li>
                </ul>
                <p className="mt-1">
                  W formularzu będziemy używać słowa &quot;alimenty&quot;,
                  ponieważ takie określenie stosuje prawo i praktyka sądowa –
                  nawet jeśli sposób finansowania potrzeb dziecka został
                  ustalony inaczej. np. w wyniku porozumienia. Niezależnie od
                  formy, chodzi o to samo: zapewnienie dziecku odpowiedniego
                  wsparcia i zabezpieczenia jego potrzeb.
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-sky-950 mb-4">
                Wybierz ścieżkę, która najlepiej opisuje Twoją sytuację:
              </p>

              <div className="space-y-4">
                {/* Opcja 1 - Memoizowany komponent */}
                <PathOption
                  id="established"
                  isSelected={selectedOption === "established"}
                  onSelect={handleOptionSelect}
                  title="Zasady finansowania potrzeb dziecka są już ustalone"
                  tooltipContent={
                    <div className="space-y-2 text-sm">
                      <p>
                        Twoje odpowiedzi – pseudonimizowane i przetwarzane
                        zgodnie z RODO – pomogą lepiej zrozumieć, jak w praktyce
                        wygląda finansowe wspieranie dzieci po rozstaniu
                        rodziców.
                      </p>
                      <p>
                        Jeśli znajdziesz się wśród pierwszych 1000 osób, które
                        wypełnią formularz, otrzymasz bezpłatnie
                        spersonalizowany raport.
                      </p>
                      <p>
                        Pokaże on, jak Twoja sytuacja wygląda na tle innych
                        przypadków – co może być pomocne, jeśli zastanawiasz
                        się, czy sposób finansowania potrzeb dziecka jest
                        adekwatny.
                      </p>
                    </div>
                  }
                  description="Chcę wypełnić formularz i podzielić się informacjami o
                  swojej sytuacji."
                  callToAction="Jeśli wybierzesz tę opcję, przejdziesz do pełnego
                  formularza AliMatrix."
                />

                {/* Opcja 2 - Memoizowany komponent */}
                <PathOption
                  id="not-established"
                  isSelected={selectedOption === "not-established"}
                  onSelect={handleOptionSelect}
                  title="Zasady finansowania potrzeb dziecka nie zostały jeszcze
                  ustalone"
                  tooltipContent={
                    <div className="space-y-2 text-sm">
                      <p>
                        Obecnie koncentrujemy się na zebraniu informacji od
                        osób, które już mają ustalone zasady finansowego
                        wsparcia dzieci.
                      </p>
                      <p>
                        Na tej podstawie powstaną pierwsze raporty, które
                        udostępnimy także osobom w Twojej sytuacji.
                      </p>
                      <p>
                        Jeśli chcesz otrzymać powiadomienie, gdy raporty będą
                        gotowe – możesz zostawić swój adres e-mail. Dzięki temu
                        jako pierwszy(a) dowiesz się o możliwości skorzystania z
                        wyników analizy.
                      </p>
                    </div>
                  }
                  description="Chciał(a)bym dowiedzieć się, jak to może wyglądać."
                  callToAction="Jeśli wybierzesz tę opcję, przekierujemy Cię do
                  krótszego formularza zapisu na powiadomienie."
                />
              </div>

              {/* Wyświetlanie błędu walidacji */}
              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </div>

            <div className="flex space-x-3 pt-2">
              {" "}
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  safeNavigate(() => router.push("/"), undefined, 100)
                }
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
