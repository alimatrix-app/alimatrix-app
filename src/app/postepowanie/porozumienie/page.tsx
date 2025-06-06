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

export default function PostepowaniePorozumienie() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // CSRF token initialization - enhanced security protection for agreement proceedings
  const csrfInitialized = useRef(false);

  useEffect(() => {
    if (!csrfInitialized.current) {
      const operationId = generateOperationId();
      trackedLog(
        operationId,
        "Initializing CSRF protection for agreement proceedings"
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
        "CSRF protection initialized for agreement proceedings"
      );
    }
  }, [updateFormData]);

  // Stan oceny adekwatności porozumienia
  const [ocenaAdekwatnosci, setOcenaAdekwatnosci] = useState<number>(
    formData.ocenaAdekwatnosciPorozumienie || 3
  );

  // Stany dla pozostałych pól formularza
  const [dataPorozumienia, setDataPorozumienia] = useState<string>(
    formData.dataPorozumienia || ""
  );
  const [sposobPorozumienia, setSposobPorozumienia] = useState<string>(
    formData.sposobPorozumienia || ""
  );
  const [formaPorozumienia, setFormaPorozumienia] = useState<string>(
    formData.formaPorozumienia || ""
  );
  const [klauzulaWaloryzacyjna, setKlauzulaWaloryzacyjna] = useState<string>(
    formData.klauzulaWaloryzacyjna || ""
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
    trackedLog(operationId, "Starting agreement proceedings form submission");

    try {
      // Prepare secure form data
      const porozumienieData = {
        ocenaAdekwatnosciPorozumienie: ocenaAdekwatnosci,
        wariantPostepu: "agreement" as const,
        dataPorozumienia: dataPorozumienia,
        sposobPorozumienia: sposobPorozumienia,
        formaPorozumienia: formaPorozumienia,
        klauzulaWaloryzacyjna: klauzulaWaloryzacyjna,
      };

      // Save data with retry mechanism for enhanced reliability
      await retryOperation(
        async () => {
          await updateFormData({
            ...porozumienieData,
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
          operationName: "Update form data - agreement proceedings",
          operationId,
        }
      );

      // Record form submission for security analysis
      recordSubmission();
      trackedLog(operationId, "Agreement proceedings data saved successfully");

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
        "Error in agreement proceedings submission",
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
    dataPorozumienia,
    sposobPorozumienia,
    formaPorozumienia,
    klauzulaWaloryzacyjna,
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
    trackedLog(operationId, "Back navigation from agreement proceedings");

    try {
      // Save current data before going back
      const porozumienieData = {
        ocenaAdekwatnosciPorozumienie: ocenaAdekwatnosci,
        wariantPostepu: "agreement" as const,
        dataPorozumienia: dataPorozumienia,
        sposobPorozumienia: sposobPorozumienia,
        formaPorozumienia: formaPorozumienia,
        klauzulaWaloryzacyjna: klauzulaWaloryzacyjna,
      };

      await updateFormData({
        ...porozumienieData,
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
    dataPorozumienia,
    sposobPorozumienia,
    formaPorozumienia,
    klauzulaWaloryzacyjna,
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
              <h1 className="text-2xl font-bold">Informacje o porozumieniu</h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      W tej części zbieramy informacje o porozumieniu, które
                      określiło zasady finansowania potrzeb dziecka. Zależy nam
                      na lepszym zrozumieniu kontekstu zawartego porozumienia -
                      kiedy zostało zawarte, w jaki sposób, oraz jaką ma formę.
                    </p>
                    <p>
                      Wiemy, że wiele porozumień nie trafia do sądu, ale mają
                      one realne znaczenie w codziennym życiu i w rzeczywistości
                      alimentacyjnej.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label className="block mb-2">
                  Data zawarcia porozumienia
                  <InfoTooltip
                    content={
                      <div className="text-sm">
                        <p>
                          Dzięki tej dacie system lepiej dopasuje porównania do
                          sytuacji rynkowej z tamtego okresu.
                        </p>
                      </div>
                    }
                  />
                </Label>
                <Input
                  type="date"
                  value={dataPorozumienia}
                  onChange={(e) => setDataPorozumienia(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <Label className="block mb-2">
                  Sposób zawarcia porozumienia
                </Label>
                <Select
                  value={sposobPorozumienia}
                  onValueChange={setSposobPorozumienia}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mediator">
                      Przy udziale mediatora
                    </SelectItem>
                    <SelectItem value="prawnik">
                      Przy udziale prawnika/adwokata
                    </SelectItem>
                    <SelectItem value="samodzielnie">
                      Samodzielnie (bezpośrednio między rodzicami)
                    </SelectItem>
                    <SelectItem value="inny">Inny</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block mb-2">Forma porozumienia</Label>
                <Select
                  value={formaPorozumienia}
                  onValueChange={setFormaPorozumienia}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pisemna">
                      Pisemna (podpisany dokument)
                    </SelectItem>
                    <SelectItem value="ustna">Ustna (bez dokumentu)</SelectItem>
                    <SelectItem value="elektroniczna">
                      Elektroniczna (e-mail, wiadomości)
                    </SelectItem>
                    <SelectItem value="inna">Inna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="block mb-2">
                  Czy porozumienie zawiera klauzulę waloryzacyjną?
                  <InfoTooltip
                    content={
                      <div className="text-sm">
                        <p>
                          Klauzula waloryzacyjna to sposób na automatyczne
                          dostosowanie wysokości alimentów do zmieniających się
                          warunków ekonomicznych, np. poprzez coroczną
                          indeksację o wskaźnik inflacji.
                        </p>
                      </div>
                    }
                  />
                </Label>
                <RadioGroup
                  value={klauzulaWaloryzacyjna}
                  onValueChange={setKlauzulaWaloryzacyjna}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tak" id="klauzula-tak" />
                    <Label htmlFor="klauzula-tak">Tak</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nie" id="klauzula-nie" />
                    <Label htmlFor="klauzula-nie">Nie</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nie-wiem" id="klauzula-nie-wiem" />
                    <Label htmlFor="klauzula-nie-wiem">Nie wiem</Label>
                  </div>
                </RadioGroup>
              </div>
              <label className="block">
                <span className="block mb-2">
                  Jak oceniasz adekwatność osiągniętego porozumienia w Twojej
                  sprawie?
                </span>
                <div className="text-sm text-gray-600 mb-2">
                  Oceń w skali 1–5, gdzie 1 oznacza &ldquo;zupełnie
                  nieadekwatne&rdquo;, a 5 &ldquo;w pełni adekwatne&rdquo;
                </div>
                <div className="relative py-5">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">
                      zupełnie nieadekwatne
                    </span>
                    <span className="text-sm text-gray-600">
                      w pełni adekwatne
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
