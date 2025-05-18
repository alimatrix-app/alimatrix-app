"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import Link from "next/link";

export default function Wysylka() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // Stan formularza
  const [email, setEmail] = useState<string>(formData.contactEmail || "");
  const [zgodaPrzetwarzanie, setZgodaPrzetwarzanie] = useState<boolean>(
    formData.zgodaPrzetwarzanie || false
  );
  const [zgodaKontakt, setZgodaKontakt] = useState<boolean>(
    formData.zgodaKontakt || false
  );

  // Stan przesyłania
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>("");
  // Generuj token CSRF przy ładowaniu strony
  useEffect(() => {
    const token = generateCSRFToken();
    setCsrfToken(token);
    storeCSRFToken(token);

    // Dodajemy dodatkowe zabezpieczenie przed wielokrotnym wysyłaniem formularza
    const handleBeforeUnload = () => {
      // Zapisujemy formularz przed opuszczeniem strony
      updateFormData({
        contactEmail: email,
        zgodaPrzetwarzanie,
        zgodaKontakt,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [email, zgodaPrzetwarzanie, zgodaKontakt, updateFormData]);

  // Obsługa przycisku "Wstecz"
  const handleBack = () => {
    // Zapisz dane formularza przed powrotem
    updateFormData({
      contactEmail: email,
      zgodaPrzetwarzanie,
      zgodaKontakt,
    });

    router.push("/informacje-o-tobie");
  }; // Obsługa zakończenia formularza
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja formularza
    if (!email || !validateEmail(email)) {
      console.log("Email validation failed on client:", email);
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
    console.log("Submitting with email:", trimmedEmail);

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
      setErrorMessage("Validacja danych formularza...");

      // Przygotuj dane do wysyłki z uwzględnieniem nowych pól
      const submissionData = {
        ...formData,
        contactEmail: trimmedEmail,
        zgodaPrzetwarzanie,
        zgodaKontakt,
        submissionDate: new Date().toISOString(),
        csrfToken: csrfToken, // Dodaj token CSRF
        notHuman: "", // Puste pole honeypot do wykrywania botów
      };

      // Log dla developerów - jakie dane sądowe są wysyłane
      console.log("Dane sądu do wysyłki:", {
        rokDecyzjiSad: submissionData.rokDecyzjiSad,
        miesiacDecyzjiSad: submissionData.miesiacDecyzjiSad,
        rodzajSaduSad: submissionData.rodzajSaduSad,
        apelacjaSad: submissionData.apelacjaSad,
        sadOkregowyId: submissionData.sadOkregowyId,
        sadRejonowyId: submissionData.sadRejonowyId,
      });

      console.log("Submission data:", JSON.stringify(submissionData));

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
        console.error("Network error during fetch:", error);
        throw new Error(
          "Błąd połączenia z serwerem. Sprawdź swoje połączenie internetowe i spróbuj ponownie."
        );
      });

      console.log("Response status:", response.status);
      if (!response.ok) {
        // Próbujemy odczytać szczegóły błędu
        try {
          const errorData = await response.json();
          console.error("Server returned error:", errorData);
          throw new Error(
            errorData.error ||
              "Wystąpił problem z wysyłaniem formularza. Spróbuj ponownie."
          );
        } catch (jsonError) {
          // Jeśli nie możemy odczytać JSON, zwracamy ogólny błąd
          console.error("Failed to parse error response:", jsonError);
          throw new Error(
            "Wystąpił problem z wysyłaniem formularza. Spróbuj ponownie."
          );
        }
      } // Odczytaj odpowiedź i pobierz ID zgłoszenia
      const responseData = await response.json();
      console.log("Response data:", responseData);

      // Zapisz ID zgłoszenia do formData
      if (responseData.id) {
        updateFormData({
          submissionId: responseData.id,
        });
      }

      // Przekieruj do strony potwierdzenia z ID
      router.push(`/dziekujemy?id=${responseData.id || "unknown"}`);
    } catch (error) {
      console.error("Błąd wysyłki formularza:", error);
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
          <div className="flex justify-center mb-6">
            <Logo size="medium" />
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
                oddzielnie, choć na potrzeby przygotowania raportu możliwe jest
                ich powiązanie. W każdej chwili możesz zażądać wglądu, zmiany
                lub usunięcia wszystkich swoich danych.
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
                    console.log("Email changed:", newEmail);
                    setEmail(newEmail);
                  }}
                  onBlur={(e) => {
                    // Validate and trim on blur
                    const trimmedEmail = e.target.value.trim();
                    setEmail(trimmedEmail);
                    if (trimmedEmail && !validateEmail(trimmedEmail)) {
                      console.log("Email invalid on blur");
                      setErrorMessage("Wprowadź poprawny adres email.");
                    } else {
                      console.log("Email valid or empty on blur");
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
