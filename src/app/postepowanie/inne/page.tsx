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
import { Label } from "@/components/ui/label";
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

export default function PostepowanieInne() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // CSRF token initialization - enhanced security protection for other arrangements
  const csrfInitialized = useRef(false);

  useEffect(() => {
    if (!csrfInitialized.current) {
      const operationId = generateOperationId();
      trackedLog(
        operationId,
        "Initializing CSRF protection for other arrangements"
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
        "CSRF protection initialized for other arrangements"
      );
    }
  }, [updateFormData]);

  // Stan oceny adekwatności ustaleń
  const [ocenaAdekwatnosci, setOcenaAdekwatnosci] = useState<number>(
    formData.ocenaAdekwatnosciInne || 3
  );

  // Stany dla pozostałych pól formularza
  const [dataUstalenInnych, setDataUstalenInnych] = useState<string>(
    formData.dataUstalenInnych || ""
  );
  const [uzgodnienieFinansowania, setUzgodnienieFinansowania] =
    useState<string>(formData.uzgodnienieFinansowania || "");
  const [planyWystapieniaDoSadu, setPlanyWystapieniaDoSadu] = useState<string>(
    formData.planyWystapieniaDoSadu || ""
  );

  // Enhanced state management for security and error handling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Scroll to top function
  const scrollToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  // Enhanced function for handling next step with security features
  const handleNext = useCallback(async () => {
    // Prevent multiple submissions
    if (isSubmitting || !safeToSubmit()) {
      trackedLog(
        "user-action",
        "Form submission prevented: Already submitting or too soon after last submission"
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const operationId = generateOperationId();
    trackedLog(operationId, "Starting other arrangements form submission");
    try {
      // Prepare secure form data
      const inneArrangementsData = {
        ocenaAdekwatnosciInne: ocenaAdekwatnosci,
        wariantPostepu: "other" as const,
        dataUstalenInnych: dataUstalenInnych,
        uzgodnienieFinansowania: uzgodnienieFinansowania,
        planyWystapieniaDoSadu: planyWystapieniaDoSadu,
      };

      // Save data with retry mechanism for enhanced reliability
      await retryOperation(
        async () => {
          await updateFormData({
            ...inneArrangementsData,
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
          operationName: "Update form data - other arrangements",
          operationId,
        }
      );

      // Record form submission for security analysis
      recordSubmission();
      trackedLog(operationId, "Other arrangements data saved successfully");

      // Scroll to top before navigation
      scrollToTop();

      // Enhanced navigation with delay for better UX
      setTimeout(() => {
        trackedLog(operationId, "Navigating to informacje-o-tobie");
        router.push("/informacje-o-tobie");

        // Prevent back button issues
        setTimeout(() => {
          setIsSubmitting(false);
        }, 500);
      }, 100);
    } catch (error) {
      trackedLog(
        operationId,
        "Error in other arrangements submission",
        error,
        "error"
      );
      setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
      setIsSubmitting(false);
      scrollToTop();
    }
  }, [
    isSubmitting,
    ocenaAdekwatnosci,
    dataUstalenInnych,
    uzgodnienieFinansowania,
    planyWystapieniaDoSadu,
    formData.__meta?.csrfToken,
    updateFormData,
    router,
    scrollToTop,
  ]);

  // Enhanced function for handling back navigation with security features
  const handleBack = useCallback(async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const operationId = generateOperationId();
    trackedLog(operationId, "Back navigation from other arrangements");
    try {
      // Save current data before going back
      const inneArrangementsData = {
        ocenaAdekwatnosciInne: ocenaAdekwatnosci,
        wariantPostepu: "other" as const,
        dataUstalenInnych: dataUstalenInnych,
        uzgodnienieFinansowania: uzgodnienieFinansowania,
        planyWystapieniaDoSadu: planyWystapieniaDoSadu,
      };

      await updateFormData({
        ...inneArrangementsData,
        __meta: {
          lastUpdated: Date.now(),
          formVersion: "1.2.0",
          csrfToken: formData.__meta?.csrfToken,
        },
      });

      // Scroll to top before navigation
      scrollToTop();

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
    dataUstalenInnych,
    uzgodnienieFinansowania,
    planyWystapieniaDoSadu,
    formData.__meta?.csrfToken,
    updateFormData,
    router,
    scrollToTop,
  ]);

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
                Ustalenia tymczasowe, ustne lub jednostronne
              </h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      Czasem sposób dzielenia się kosztami dziecka nie wynika z
                      decyzji sądu ani formalnego porozumienia – ale z
                      doraźnych, tymczasowych lub jednostronnych ustaleń. Chcemy
                      lepiej zrozumieć także te sytuacje.
                    </p>
                    <p>
                      To ważne, by uchwycić, jak w praktyce wyglądają
                      rozwiązania stosowane przez rodziców poza oficjalnymi
                      ścieżkami.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="block mb-2">
                  Od kiedy obowiązuje obecny sposób finansowania potrzeb
                  dziecka?
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
                </Label>
                <Input
                  type="date"
                  value={dataUstalenInnych}
                  onChange={(e) => setDataUstalenInnych(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="block mb-2">
                  Czy sposób finansowania został wcześniej uzgodniony z drugim
                  rodzicem?
                  <InfoTooltip
                    content={
                      <div className="text-sm">
                        <p>
                          To pytanie pomaga zrozumieć, czy podział kosztów
                          oparty jest na konsensusie czy presji jednej ze stron.
                        </p>
                      </div>
                    }
                  />
                </Label>
                <Select
                  value={uzgodnienieFinansowania}
                  onValueChange={setUzgodnienieFinansowania}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wspolnie">
                      Tak, wspólnie ustaliliśmy zasady
                    </SelectItem>
                    <SelectItem value="jednostronnie-ja">
                      Nie – to moje jednostronne decyzje
                    </SelectItem>
                    <SelectItem value="jednostronnie-drugi">
                      Nie – to drugi rodzic narzucił te zasady
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block mb-2">
                  Czy którykolwiek z rodziców planuje w najbliższym czasie
                  wystąpienie do sądu w sprawie alimentów?
                </Label>
                <Select
                  value={planyWystapieniaDoSadu}
                  onValueChange={setPlanyWystapieniaDoSadu}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ja-planuje">Tak, ja planuję</SelectItem>
                    <SelectItem value="drugi-planuje">
                      Tak, drugi rodzic zapowiedział taki krok
                    </SelectItem>
                    <SelectItem value="nie-wiem">Nie wiem</SelectItem>
                    <SelectItem value="nie-planujemy">Nie planujemy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="block">
                <span className="block mb-2">
                  Jak oceniasz adekwatność obecnego sposobu finansowania potrzeb
                  dziecka?
                </span>
                <div className="text-sm text-gray-600 mb-2">
                  Oceń w skali 1–5, gdzie 1 oznacza &ldquo;zupełnie
                  nieadekwatny&rdquo;, a 5 &ldquo;w pełni adekwatny&rdquo;
                </div>
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
              </label>{" "}
            </div>

            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

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
