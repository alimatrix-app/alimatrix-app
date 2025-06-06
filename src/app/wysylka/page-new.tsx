"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
import { FormErrorAlert } from "@/components/ui/custom/FormErrorAlert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFormStore } from "@/lib/store/form-store";
import {
  validateEmail,
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
import Link from "next/link";

export default function Wysylka() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();
  const operationId = useRef(generateOperationId());
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Stan formularza
  const [email, setEmail] = useState<string>(formData.contactEmail || "");
  const [zgodaPrzetwarzanie, setZgodaPrzetwarzanie] = useState<boolean>(
    formData.zgodaPrzetwarzanie || false
  );
  const [zgodaKontakt, setZgodaKontakt] = useState<boolean>(
    formData.zgodaKontakt || false
  );

  // Enhanced state management for security and UX
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>("");

  // CSRF token initialization with page-specific logging
  useEffect(() => {
    const token = generateCSRFToken();
    setCsrfToken(token);
    storeCSRFToken(token);

    trackedLog(
      operationId.current,
      "CSRF token generated for Wysylka page",
      {
        operation: "csrf_init",
        page: "wysylka",
        timestamp: new Date().toISOString(),
      },
      "info"
    );

    // Enhanced form data preservation with security logging
    const handleBeforeUnload = () => {
      updateFormData({
        contactEmail: email,
        zgodaPrzetwarzanie,
        zgodaKontakt,
      });

      trackedLog(
        operationId.current,
        "Form data preserved before page unload",
        {
          operation: "form_preserve",
          page: "wysylka",
          hasEmail: !!email,
          hasConsents: zgodaPrzetwarzanie && zgodaKontakt,
        },
        "debug"
      );
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [email, zgodaPrzetwarzanie, zgodaKontakt, updateFormData]);

  // Enhanced secure back navigation with retry mechanism
  const handleBack = useCallback(() => {
    const backOperation = async () => {
      trackedLog(
        operationId.current,
        "Back navigation initiated",
        {
          operation: "back_nav",
          page: "wysylka",
          hasFormChanges: !!(email || zgodaPrzetwarzanie || zgodaKontakt),
        },
        "info"
      );

      updateFormData({
        contactEmail: email,
        zgodaPrzetwarzanie,
        zgodaKontakt,
      });

      router.push("/informacje-o-tobie");
    };

    retryOperation(backOperation, {
      maxAttempts: 3,
      operationId: operationId.current,
      operationName: `back-nav-${operationId.current}`,
    }).catch((error) => {
      setError("Wystąpił problem podczas nawigacji. Spróbuj ponownie.");
      trackedLog(
        operationId.current,
        "Back navigation failed after retries",
        {
          operation: "back_nav_error",
          error: error.message,
        },
        "error"
      );
    });
  }, [email, zgodaPrzetwarzanie, zgodaKontakt, updateFormData, router]);

  // Enhanced secure form submission with comprehensive security checks
  const handleFormSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      trackedLog(
        operationId.current,
        "Form submission initiated",
        {
          operation: "form_submit_start",
          page: "wysylka",
          hasEmail: !!email,
          hasConsents: zgodaPrzetwarzanie && zgodaKontakt,
        },
        "info"
      );

      scrollToTop();

      // Enhanced validation with security logging
      if (!email || !validateEmail(email)) {
        setErrorMessage("Wprowadź poprawny adres email.");
        trackedLog(
          operationId.current,
          "Form validation failed - invalid email",
          { email: !!email, operation: "validation_error" },
          "warn"
        );
        return;
      }

      if (!zgodaPrzetwarzanie || !zgodaKontakt) {
        setErrorMessage(
          "Aby kontynuować, wyraż zgodę na przetwarzanie danych i kontakt mailowy."
        );
        trackedLog(
          operationId.current,
          "Form validation failed - missing consents",
          {
            zgodaPrzetwarzanie,
            zgodaKontakt,
            operation: "validation_error",
          },
          "warn"
        );
        return;
      }

      const trimmedEmail = email.trim();

      // Save form data before submission
      updateFormData({
        contactEmail: trimmedEmail,
        zgodaPrzetwarzanie,
        zgodaKontakt,
      });

      // Set submitting state
      setIsSubmitting(true);
      setErrorMessage(null);
      setError(null);

      try {
        // Anti-spam delay with user feedback
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setErrorMessage("Przygotowywanie danych do wysyłki...");

        // Security check for rapid submissions
        if (!safeToSubmit()) {
          setErrorMessage(
            "Proszę odczekać chwilę przed ponownym wysłaniem formularza."
          );
          setIsSubmitting(false);
          trackedLog(
            operationId.current,
            "Form submission blocked - too frequent",
            { operation: "security_block" },
            "warn"
          );
          return;
        }

        // Record submission timestamp
        recordSubmission();

        setErrorMessage("Validacja danych formularza...");

        // Enhanced data processing with children/costs merging
        let updatedFormData = { ...formData };
        if (
          formData.dzieci &&
          Array.isArray(formData.dzieci) &&
          formData.kosztyDzieci &&
          Array.isArray(formData.kosztyDzieci)
        ) {
          const mergedDzieci = formData.dzieci.map((dziecko) => {
            const kosztyDziecka = formData.kosztyDzieci?.find(
              (k) => k.id === dziecko.id
            );

            if (kosztyDziecka) {
              return {
                ...dziecko,
                kwotaAlimentow: kosztyDziecka.kwotaAlimentow,
                twojeMiesieczneWydatki: kosztyDziecka.twojeMiesieczneWydatki,
                wydatkiDrugiegoRodzica: kosztyDziecka.wydatkiDrugiegoRodzica,
                kosztyUznanePrzezSad: kosztyDziecka.kosztyUznanePrzezSad,
                rentaRodzinna:
                  kosztyDziecka.inneZrodlaUtrzymania?.rentaRodzinna || false,
                rentaRodzinnaKwota:
                  kosztyDziecka.inneZrodlaUtrzymania?.rentaRodzinnaKwota,
                swiadczeniePielegnacyjne:
                  kosztyDziecka.inneZrodlaUtrzymania
                    ?.swiadczeniePielegnacyjne || false,
                swiadczeniePielegnacyjneKwota:
                  kosztyDziecka.inneZrodlaUtrzymania
                    ?.swiadczeniePielegnacyjneKwota,
                inneZrodla: kosztyDziecka.inneZrodlaUtrzymania?.inne || false,
                inneZrodlaOpis: kosztyDziecka.inneZrodlaUtrzymania?.inneOpis,
                inneZrodlaKwota: kosztyDziecka.inneZrodlaUtrzymania?.inneKwota,
                brakDodatkowychZrodel:
                  kosztyDziecka.inneZrodlaUtrzymania?.brakDodatkowychZrodel ||
                  true,
              };
            }
            return dziecko;
          });

          updatedFormData = { ...updatedFormData, dzieci: mergedDzieci };
        }

        // Prepare secure submission data
        const submissionData = {
          ...updatedFormData,
          contactEmail: trimmedEmail,
          zgodaPrzetwarzanie,
          zgodaKontakt,
          submissionDate: new Date().toISOString(),
          csrfToken: csrfToken,
          notHuman: "", // Honeypot field
          operationId: operationId.current,
        };

        setErrorMessage("Zapisywanie danych do systemu...");

        trackedLog(
          operationId.current,
          "Submitting form data to server",
          {
            operation: "server_submit",
            dataSize: JSON.stringify(submissionData).length,
            hasChildren: !!submissionData.dzieci?.length,
          },
          "info"
        );

        // Secure server submission with comprehensive headers
        const response = await fetch("/api/secure-submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-Token": csrfToken,
            "X-Operation-ID": operationId.current,
          },
          body: JSON.stringify(submissionData),
        }).catch((error) => {
          throw new Error(
            "Błąd połączenia z serwerem. Sprawdź swoje połączenie internetowe i spróbuj ponownie."
          );
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(
              errorData.error ||
                "Wystąpił problem z wysyłaniem formularza. Spróbuj ponownie."
            );
          } catch (jsonError) {
            throw new Error(
              "Wystąpił problem z wysyłaniem formularza. Spróbuj ponownie."
            );
          }
        }

        const responseData = await response.json();

        trackedLog(
          operationId.current,
          "Form submission successful",
          {
            operation: "submit_success",
            submissionId: responseData.id,
            isOffline: responseData.isOffline,
          },
          "info"
        );

        // Save submission ID to form data
        if (responseData.id) {
          updateFormData({
            submissionId: responseData.id,
            isOfflineSubmission: responseData.isOffline === true,
          });

          // Handle offline submissions
          if (responseData.isOffline) {
            try {
              const { saveFormDataLocally } = await import(
                "@/lib/offline-support"
              );
              saveFormDataLocally({
                ...submissionData,
                submissionId: responseData.id,
                savedAt: new Date().toISOString(),
              });
            } catch (offlineError) {
              setErrorMessage(
                "Wystąpił problem z zapisem danych w trybie offline."
              );
              trackedLog(
                operationId.current,
                "Offline save failed",
                { error: offlineError },
                "error"
              );
            }
          }
        }

        // Navigate to confirmation page with security logging
        const confirmationUrl = `/dziekujemy?id=${
          responseData.id || "unknown"
        }${responseData.isOffline ? "&offline=true" : ""}`;

        trackedLog(
          operationId.current,
          "Redirecting to confirmation",
          {
            operation: "redirect_confirmation",
            url: confirmationUrl.split("?")[0], // Log path only for privacy
          },
          "info"
        );

        router.push(confirmationUrl);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Wystąpił nieznany błąd podczas wysyłania formularza.";

        setErrorMessage(errorMessage);
        setError(errorMessage);

        trackedLog(
          operationId.current,
          "Form submission failed",
          {
            operation: "submit_error",
            error: errorMessage,
          },
          "error"
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      email,
      zgodaPrzetwarzanie,
      zgodaKontakt,
      formData,
      updateFormData,
      router,
      csrfToken,
      scrollToTop,
    ]
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-lg shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={11} totalSteps={12} />

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Podanie e-maila i zgody</h1>
            </div>

            <div>
              <p className="text-gray-700 mb-2">
                Zostaw swój adres e-mail, żebyśmy mogli przesłać Ci
                spersonalizowany raport przygotowany na podstawie Twoich
                odpowiedzi.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Potrzebujemy Twojego adresu e-mail – wyłącznie po to, żebyśmy
                mogli bezpiecznie przesłać Ci Twój raport. Twój adres
                przechowujemy zgodnie z RODO. Nie wykorzystujemy go do żadnych
                innych celów. Dane analityczne i kontaktowe są przechowywane
                oddzielnie, wyłącznie na potrzeby wysłania raportu odbywa się
                ich tymczasowe powiązanie. W każdej chwili możesz zażądać
                wglądu, zmiany lub usunięcia wszystkich swoich danych.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="email-input"
                  className="flex items-center gap-2"
                >
                  Twój adres e-mail (wymagane)
                  <InfoTooltip
                    content={
                      <div className="text-sm">
                        <p>
                          Twój e-mail będzie wykorzystany wyłącznie w celu
                          przesłania Ci spersonalizowanego raportu. Nie będziemy
                          wysyłać żadnych reklam ani udostępniać Twoich danych
                          osobom trzecim. Adres e-mail będzie przechowywany
                          oddzielnie od danych analitycznych.
                        </p>
                      </div>
                    }
                  />
                </Label>

                <Input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setEmail(newEmail);
                    // Clear errors when user starts typing
                    if (errorMessage || error) {
                      setErrorMessage(null);
                      setError(null);
                    }
                  }}
                  onBlur={(e) => {
                    const trimmedEmail = e.target.value.trim();
                    setEmail(trimmedEmail);
                    if (trimmedEmail && !validateEmail(trimmedEmail)) {
                      setErrorMessage("Wprowadź poprawny adres email.");
                    } else if (
                      errorMessage === "Wprowadź poprawny adres email."
                    ) {
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="twoj@email.pl"
                  className="w-full mt-1"
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>

              {/* Enhanced honeypot field for bot detection */}
              <div className="opacity-0 absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
                <label htmlFor="notHuman">Zostaw to pole puste</label>
                <input
                  type="text"
                  id="notHuman"
                  name="notHuman"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-3 mt-6">
                <h3 className="text-lg font-semibold text-gray-800">
                  Zgody i ochrona prywatności
                </h3>
                <p className="text-sm text-gray-600">
                  Zanim zakończysz wypełnianie formularza, prosimy Cię o
                  wyrażenie zgód niezbędnych do przygotowania i przesłania
                  raportu.
                </p>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent-data-processing"
                    checked={zgodaPrzetwarzanie}
                    onCheckedChange={(checked) => {
                      setZgodaPrzetwarzanie(checked as boolean);
                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                    }}
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="consent-data-processing"
                    className="text-sm font-normal"
                  >
                    ✅ Wyrażam zgodę na przetwarzanie przekazanych przeze mnie
                    danych w celu ich analizy statystycznej i wygenerowania
                    spersonalizowanego raportu w ramach projektu AliMatrix.
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="consent-contact"
                    checked={zgodaKontakt}
                    onCheckedChange={(checked) => {
                      setZgodaKontakt(checked as boolean);
                      if (errorMessage) {
                        setErrorMessage(null);
                      }
                    }}
                    className="mt-1"
                    disabled={isSubmitting}
                  />
                  <Label
                    htmlFor="consent-contact"
                    className="text-sm font-normal"
                  >
                    ✅ Wyrażam zgodę na kontakt mailowy w celu dostarczenia
                    mojego raportu oraz ewentualnej komunikacji związanej z
                    dalszą realizacją usługi. Mój adres e-mail będzie
                    przechowywany oddzielnie od pozostałych danych
                    analitycznych.
                  </Label>
                </div>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg mt-4">
                <p className="text-sm text-gray-700 font-semibold">
                  🔒 Klauzula informacyjna RODO (skrótowa wersja)
                </p>
                <p className="text-xs text-gray-600">
                  AliMatrix przetwarza Twoje dane zgodnie z RODO – z pełnym
                  poszanowaniem prywatności. Dane kontaktowe i analityczne są od
                  siebie oddzielone. W każdej chwili możesz zażądać wglądu,
                  korekty lub usunięcia wszystkich danych, które przekazałeś.
                  Szczegóły znajdziesz w{" "}
                  <Link
                    href="/polityka-prywatnosci"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Polityce Prywatności
                  </Link>{" "}
                  i{" "}
                  <Link
                    href="/regulamin"
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Regulaminie
                  </Link>
                  .
                </p>
              </div>

              {/* Enhanced error display with better UX */}
              {(errorMessage || error) && (
                <FormErrorAlert message={errorMessage || error || ""} />
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Wstecz
              </Button>

              <Button
                type="submit"
                className="flex-1"
                disabled={
                  isSubmitting || !email || !zgodaPrzetwarzanie || !zgodaKontakt
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Przetwarzanie...
                  </>
                ) : (
                  "Zakończ"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
