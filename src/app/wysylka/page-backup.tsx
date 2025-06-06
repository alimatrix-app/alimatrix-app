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
    
    trackedLog("CSRF token generated for Wysylka page", {
      operation: "csrf_init",
      operationId: operationId.current,
      page: "wysylka",
      timestamp: new Date().toISOString(),
    });    // Enhanced form data preservation with security logging
    const handleBeforeUnload = () => {
      updateFormData({
        contactEmail: email,
        zgodaPrzetwarzanie,
        zgodaKontakt,
      });
      
      trackedLog("Form data preserved before page unload", {
        operation: "form_preserve",
        operationId: operationId.current,
        page: "wysylka",
        hasEmail: !!email,
        hasConsents: zgodaPrzetwarzanie && zgodaKontakt,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [email, zgodaPrzetwarzanie, zgodaKontakt, updateFormData]);

  // Enhanced secure back navigation with retry mechanism
  const handleBack = useCallback(() => {
    const backOperation = async () => {
      trackedLog("Back navigation initiated", {
        operation: "back_nav",
        operationId: operationId.current,
        page: "wysylka",
        hasFormChanges: !!(email || zgodaPrzetwarzanie || zgodaKontakt),
      });

      updateFormData({
        contactEmail: email,
        zgodaPrzetwarzanie,
        zgodaKontakt,
      });

      router.push("/informacje-o-tobie");
    };

    retryOperation(backOperation, 3, `back-nav-${operationId.current}`)
      .catch((error) => {
        setError("Wystąpił problem podczas nawigacji. Spróbuj ponownie.");
        trackedLog("Back navigation failed after retries", {
          operation: "back_nav_error",
          operationId: operationId.current,
          error: error.message,
        });
      });
  }, [email, zgodaPrzetwarzanie, zgodaKontakt, updateFormData, router]);

  // Enhanced secure form submission with comprehensive security checks
  const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    trackedLog("Form submission initiated", {
      operation: "form_submit_start",
      operationId: operationId.current,
      page: "wysylka",
      hasEmail: !!email,
      hasConsents: zgodaPrzetwarzanie && zgodaKontakt,
    });

    scrollToTop();
    if (!email || !validateEmail(email)) {
      setErrorMessage("Wprowadź poprawny adres email.");
      return;
    }

    if (!zgodaPrzetwarzanie || !zgodaKontakt) {
      setErrorMessage(
        "Aby kontynuować, wyraź zgodę na przetwarzanie danych i kontakt mailowy."
      );
      return;
    }
    const trimmedEmail = email.trim();

    // Zapisz dane formularza przed wysłaniem
    updateFormData({
      contactEmail: trimmedEmail,
      zgodaPrzetwarzanie,
      zgodaKontakt,
    });

    // Ustaw stan przesyłania
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Dodaj opóźnienie anty-spamowe
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Wyświetl informację o przygotowaniu danych
      setErrorMessage("Przygotowywanie danych do wysyłki...");

      // Sprawdź, czy nie jest to próba zbyt szybkiego ponownego wysłania formularza
      if (!safeToSubmit()) {
        setErrorMessage(
          "Proszę odczekać chwilę przed ponownym wysłaniem formularza."
        );
        setIsSubmitting(false);
        return;
      }

      // Zapisz czas wysłania formularza
      recordSubmission();

      // Wyświetl informację o validacji danych
      setErrorMessage("Validacja danych formularza..."); // Sprawdź czy istnieją dane dzieci i kosztyDzieci, a jeśli tak, połącz je
      let updatedFormData = { ...formData };
      if (
        formData.dzieci &&
        Array.isArray(formData.dzieci) &&
        formData.kosztyDzieci &&
        Array.isArray(formData.kosztyDzieci)
      ) {
        // Połącz dane z kosztyDzieci z odpowiednimi rekordami w tablicy dzieci
        const mergedDzieci = formData.dzieci.map((dziecko) => {
          // Znajdź odpowiednie koszty dla tego dziecka
          const kosztyDziecka = formData.kosztyDzieci?.find(
            (k) => k.id === dziecko.id
          );

          if (kosztyDziecka) {
            // Połącz dane kosztów z danymi dziecka
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
                kosztyDziecka.inneZrodlaUtrzymania?.swiadczeniePielegnacyjne ||
                false,
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

        // Zaktualizuj tablicę dzieci połączonymi danymi
        updatedFormData = { ...updatedFormData, dzieci: mergedDzieci };
      }

      // Przygotuj dane do wysyłki z uwzględnieniem nowych pól
      const submissionData = {
        ...updatedFormData,
        contactEmail: trimmedEmail,
        zgodaPrzetwarzanie,
        zgodaKontakt,
        submissionDate: new Date().toISOString(),
        csrfToken: csrfToken, // Dodaj token CSRF
        notHuman: "", // Puste pole honeypot do wykrywania botów
      };

      // Wyświetl informację o wysyłaniu
      setErrorMessage("Zapisywanie danych do systemu...");

      // Wysyłka danych na serwer
      const response = await fetch("/api/secure-submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Dodaj nagłówek zabezpieczający przed CSRF
          "X-Requested-With": "XMLHttpRequest",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(submissionData),
      }).catch((error) => {
        throw new Error(
          "Błąd połączenia z serwerem. Sprawdź swoje połączenie internetowe i spróbuj ponownie."
        );
      });
      if (!response.ok) {
        // Próbujemy odczytać szczegóły błędu
        try {
          const errorData = await response.json();
          throw new Error(
            errorData.error ||
              "Wystąpił problem z wysyłaniem formularza. Spróbuj ponownie."
          );
        } catch (jsonError) {
          // Jeśli nie możemy odczytać JSON, zwracamy ogólny błąd
          throw new Error(
            "Wystąpił problem z wysyłaniem formularza. Spróbuj ponownie."
          );
        }
      } // Odczytaj odpowiedź i pobierz ID zgłoszenia
      const responseData = await response.json();

      // Zapisz ID zgłoszenia do formData
      if (responseData.id) {
        updateFormData({
          submissionId: responseData.id,
          isOfflineSubmission: responseData.isOffline === true,
        }); // Jeśli to zgłoszenie offline, zapisz je lokalnie
        if (responseData.isOffline) {
          try {
            // Importujemy dynamicznie funkcję do zapisywania offline
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
          }
        }
      }

      // Przekieruj do strony potwierdzenia z ID
      router.push(
        `/dziekujemy?id=${responseData.id || "unknown"}${
          responseData.isOffline ? "&offline=true" : ""
        }`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Wystąpił nieznany błąd podczas wysyłania formularza."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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
            </div>{" "}
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
                </Label>{" "}
                <Input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setEmail(newEmail);
                  }}
                  onBlur={(e) => {
                    // Validate and trim on blur
                    const trimmedEmail = e.target.value.trim();
                    setEmail(trimmedEmail);
                    if (trimmedEmail && !validateEmail(trimmedEmail)) {
                      setErrorMessage("Wprowadź poprawny adres email.");
                    } else {
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="twoj@email.pl"
                  className="w-full mt-1"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Pole-pułapka (honeypot) dla botów - ukryte przez CSS */}
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
                    onCheckedChange={(checked) =>
                      setZgodaPrzetwarzanie(checked as boolean)
                    }
                    className="mt-1"
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
                    onCheckedChange={(checked) =>
                      setZgodaKontakt(checked as boolean)
                    }
                    className="mt-1"
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
                  >
                    Polityce Prywatności
                  </Link>{" "}
                  i{" "}
                  <Link
                    href="/regulamin"
                    className="text-blue-600 hover:underline"
                  >
                    Regulaminie
                  </Link>
                  .
                </p>
              </div>
              {/* Komunikat o błędzie */}
              {errorMessage && <FormErrorAlert message={errorMessage} />}
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
              </Button>{" "}
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
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
