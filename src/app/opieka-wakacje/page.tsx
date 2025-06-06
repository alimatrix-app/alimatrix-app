"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useFormStore } from "@/lib/store/form-store";
import { OpiekeWakacjeData } from "./typings";
import {
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";
import {
  generateCSRFToken,
  storeCSRFToken,
  safeToSubmit,
  recordSubmission,
} from "@/lib/client-security";

export default function OpiekaWakacje() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // CSRF token initialization - improved strict mode compatibility
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
  }, []);

  // Inicjalizacja stanu dla aktualnego dziecka
  const [aktualneDzieckoId] = useState<number | null>(
    formData.aktualneDzieckoWTabeliCzasu || null
  );
  // Stan dla danych o opiece w okresach specjalnych (wakacje, święta, itp.)
  const [wakacjeProcentCzasu, setWakacjeProcentCzasu] = useState<number>(50); // Domyślnie 50%
  const [wakacjeSzczegolowyPlan, setWakacjeSzczegolowyPlan] =
    useState<boolean>(false);
  const [wakacjeOpisPlan, setWakacjeOpisPlan] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Znajdź aktualne dziecko
  const aktualneDziecko = formData.dzieci?.find(
    (d) => d.id === aktualneDzieckoId
  );

  // Ładowanie zapisanych wcześniej danych dla aktualnego dziecka
  useEffect(() => {
    if (formData.dzieci && aktualneDzieckoId) {
      const dziecko = formData.dzieci.find((d) => d.id === aktualneDzieckoId);
      if (dziecko) {
        // Używamy typowania strukturalnego zamiast type assertion
        const typedDziecko = dziecko as {
          wakacjeProcentCzasu?: number;
          wakacjeSzczegolowyPlan?: boolean;
          wakacjeOpisPlan?: string;
        }; // Sprawdź, czy istnieją zapisane dane dla wakacjeProcentCzasu
        if (typedDziecko.wakacjeProcentCzasu !== undefined) {
          setWakacjeProcentCzasu(typedDziecko.wakacjeProcentCzasu);
        }

        // Sprawdź, czy istnieją dane dla wakacjeSzczegolowyPlan
        if (typedDziecko.wakacjeSzczegolowyPlan !== undefined) {
          setWakacjeSzczegolowyPlan(typedDziecko.wakacjeSzczegolowyPlan);
        }

        // Sprawdź, czy istnieją dane dla wakacjeOpisPlan
        if (typedDziecko.wakacjeOpisPlan) {
          setWakacjeOpisPlan(typedDziecko.wakacjeOpisPlan);
        }
      }
    }
  }, [formData.dzieci, aktualneDzieckoId]);

  // Funkcja do zapisywania danych
  const saveData = useCallback(async () => {
    if (aktualneDzieckoId && formData.dzieci) {
      // Walidacja - sprawdź, czy jeśli zaznaczono szczegółowy plan, to opis istnieje
      if (
        wakacjeSzczegolowyPlan &&
        (!wakacjeOpisPlan || wakacjeOpisPlan.trim().length < 10)
      ) {
        setError(
          "Jeśli zaznaczono szczegółowy plan, opis musi zawierać minimum 10 znaków."
        );
        return false;
      }

      const operationId = generateOperationId();
      try {
        const zaktualizowaneDzieci = formData.dzieci.map((dziecko) => {
          if (dziecko.id === aktualneDzieckoId) {
            const wakacjeData: OpiekeWakacjeData = {
              wakacjeProcentCzasu: wakacjeProcentCzasu,
              wakacjeSzczegolowyPlan: wakacjeSzczegolowyPlan,
              wakacjeOpisPlan: wakacjeSzczegolowyPlan
                ? wakacjeOpisPlan
                : undefined,
            };

            return {
              ...dziecko,
              ...wakacjeData,
            };
          }
          return dziecko;
        });

        // Zapisz dane z mechanizmem ponownych prób
        await retryOperation(
          async () => {
            await updateFormData({
              dzieci: zaktualizowaneDzieci,
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
            operationName: "Update form data - opieka wakacje",
            operationId,
          }
        );
        trackedLog(operationId, "Opieka wakacje data saved successfully");
        return true;
      } catch (error) {
        trackedLog(operationId, "Error saving data", "error");
        setError("Wystąpił błąd podczas zapisywania danych. Spróbuj ponownie.");
        return false;
      }
    }
    return false;
  }, [
    aktualneDzieckoId,
    formData.dzieci,
    wakacjeProcentCzasu,
    wakacjeSzczegolowyPlan,
    wakacjeOpisPlan,
    updateFormData,
  ]); // Funkcja do zapisywania danych i przechodzenia do następnego kroku
  const handleNext = useCallback(async () => {
    // Zapobieganie wielokrotnym kliknięciom
    if (isSubmitting || !safeToSubmit()) {
      trackedLog("user-action", "Form submission prevented");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const operationId = generateOperationId();
    trackedLog(operationId, "Starting wakacje opieka form submission");

    try {
      const saveSuccessful = await saveData();

      if (saveSuccessful) {
        // Zapisujemy informację o submisji formularza dla celów analizy
        recordSubmission();

        // Przewiń stronę do góry przed przejściem do następnej strony
        scrollToTop(); // Dodajemy małe opóźnienie dla lepszego UX
        setTimeout(() => {
          trackedLog(operationId, "Navigating to koszty-utrzymania");
          router.push("/koszty-utrzymania");

          // Zmniejszamy szansę na back button lub podwójną submisję
          setTimeout(() => {
            setIsSubmitting(false);
          }, 500);
        }, 100);
      } else {
        setIsSubmitting(false);
      }
    } catch (error) {
      trackedLog(operationId, "Unexpected error", "error");
      setError("Wystąpił nieoczekiwany błąd. Spróbuj ponownie.");
      setIsSubmitting(false);
    }
  }, [isSubmitting, saveData, router, scrollToTop]);

  // Funkcja do powrotu do poprzedniego kroku
  const handleBack = useCallback(async () => {
    // Zapobieganie wielokrotnym kliknięciom
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const operationId = generateOperationId();
    trackedLog(operationId, "Navigating back to czas-opieki");

    try {
      await saveData();

      // Przewiń stronę do góry przed przejściem do poprzedniej strony
      scrollToTop();

      // Dodajemy małe opóźnienie dla lepszego UX
      setTimeout(() => {
        router.push("/czas-opieki");
        setIsSubmitting(false);
      }, 100);
    } catch (error) {
      setIsSubmitting(false);
    }
  }, [isSubmitting, saveData, router, scrollToTop]);

  // Jeśli nie ma aktualnego dziecka, pokaż komunikat ładowania
  if (!aktualneDziecko) {
    return (
      <main className="flex justify-center p-3">
        <Card className="w-full max-w-lg shadow-lg border-sky-100">
          <CardContent className="pt-2">
            <Logo size="large" />
            <FormProgress currentStep={7} totalSteps={12} />
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">
                  Opieka w okresach specjalnych
                </h1>
                <InfoTooltip
                  content={
                    <div className="space-y-2 text-sm">
                      <p>
                        Dane o opiece w okresach takich jak wakacje i święta są
                        ważne dla właściwego określenia zakresu opieki i potrzeb
                        dziecka.
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
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={6} totalSteps={12} />
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">
                Opieka w okresach specjalnych
              </h1>
              <InfoTooltip
                content={
                  <div className="space-y-2 text-sm">
                    <p>
                      Dane o opiece w okresach takich jak wakacje i święta
                      pomagają dokładniej określić zakres Twojej opieki nad
                      dzieckiem.
                    </p>
                    <p>
                      Te informacje są kluczowe dla odpowiedniego zrozumienia
                      podziału czasu i związanych z nim kosztów utrzymania
                      dziecka.
                    </p>
                  </div>
                }
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium">
                Wypełniasz dane dla Dziecka {aktualneDziecko.id} (
                {aktualneDzieckoId &&
                  formData.dzieci &&
                  formData.dzieci.findIndex((d) => d.id === aktualneDzieckoId) +
                    1}
                /{formData.dzieci?.length || 0}) - {aktualneDziecko.wiek} lat
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="font-medium text-lg">
                Jak wygląda opieka nad dzieckiem w okresach takich jak wakacje,
                ferie, święta i długie weekendy?
              </h2>
              <p className="text-sm text-gray-600">
                Podaj szacunkowo, jaki procent tego czasu dziecko spędza z Tobą.
                Uwzględnij typowe zasady lub praktykę – nie musisz być
                precyzyjny. Jeśli podział jest nieregularny, wskaż średni
                udział. Jeśli masz sztywne ustalenia i chcesz je wpisać –
                zaznacz opcję poniżej.
              </p>
              <div className="py-6 bg-gray-50 p-4 rounded-md">
                {" "}
                <div className="mb-2 text-center font-medium text-lg">
                  Twoja ocena:{" "}
                  <span className="text-blue-600">{wakacjeProcentCzasu}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-600">0%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={wakacjeProcentCzasu}
                    onChange={(e) => {
                      setWakacjeProcentCzasu(parseInt(e.target.value));
                      // Reset error if present
                      if (error) setError(null);
                    }}
                    className="flex-grow h-3 rounded-lg appearance-none cursor-pointer bg-gray-200 accent-blue-600"
                    aria-label="Procent czasu spędzanego z dzieckiem"
                  />
                  <span className="text-sm font-medium text-gray-600">
                    100%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>dziecko zawsze z drugim rodzicem</span>
                  <span>mniej więcej po równo</span>
                  <span>dziecko zawsze z Tobą</span>
                </div>
              </div>{" "}
              <div className="mt-2 flex items-start space-x-2">
                <Checkbox
                  id="szczegolowy-plan"
                  checked={wakacjeSzczegolowyPlan}
                  onCheckedChange={(checked) => {
                    setWakacjeSzczegolowyPlan(checked as boolean);
                    // Reset error when changing checkbox state
                    if (error) setError(null);
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="szczegolowy-plan"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Mam szczegółowe ustalenia – chcę wpisać je ręcznie
                  </Label>
                </div>
              </div>{" "}
              {wakacjeSzczegolowyPlan && (
                <div className="mt-4">
                  <Label htmlFor="opis-planu" className="text-sm font-medium">
                    Opisz szczegółowe ustalenia{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="opis-planu"
                    value={wakacjeOpisPlan}
                    onChange={(e) => {
                      setWakacjeOpisPlan(e.target.value);
                      // Reset error when typing
                      if (error) setError(null);
                    }}
                    placeholder='Np. "W wakacje 2 tygodnie ze mną, 4 z drugim rodzicem. Święta naprzemiennie - Wigilia u mnie, pierwszy dzień u drugiego rodzica."'
                    className={`mt-1 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] ${
                      wakacjeSzczegolowyPlan &&
                      (!wakacjeOpisPlan || wakacjeOpisPlan.length < 10)
                        ? "border-red-500"
                        : "border-gray-200"
                    }`}
                  />
                  {wakacjeSzczegolowyPlan &&
                    (!wakacjeOpisPlan || wakacjeOpisPlan.length < 10) && (
                      <p className="text-red-500 text-xs mt-1">
                        Opis powinien zawierać minimum 10 znaków
                      </p>
                    )}
                  <p className="text-xs text-gray-500 mt-1">
                    Opisz szczegółowo, jak wygląda podział czasu w okresach
                    specjalnych. Podaj jak najbardziej dokładne informacje.
                  </p>
                </div>
              )}
            </div>

            {/* Wyświetlanie błędów */}
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
