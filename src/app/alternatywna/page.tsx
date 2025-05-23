"use client";

import { useState } from "react";
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useFormStore } from "@/lib/store/form-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";

export default function Alternatywna() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();
  // Stan dla formularza
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionId, setSubmissionId] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Zabezpieczenie - sprawdzamy czy użytkownik przeszedł przez wybór ścieżki
  useEffect(() => {
    if (!formData.sciezkaWybor || formData.sciezkaWybor !== "not-established") {
      router.push("/sciezka");
    }
  }, [formData.sciezkaWybor, router]);
  // Funkcja do kopiowania ID zgłoszenia
  const copyToClipboard = () => {
    if (submissionId) {
      navigator.clipboard
        .writeText(submissionId)
        .then(() => {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
        })
        .catch((err) => {
          console.error("Błąd podczas kopiowania do schowka:", err);
        });
    }
  };

  // Funkcja do obsługi zapisu
  const handleSubmit = async () => {
    // Resetujemy błędy
    setError(null);

    // Walidacja
    if (!email) {
      setError("Proszę podać adres email");
      return;
    }

    if (!consent) {
      setError("Wyrażenie zgody na przetwarzanie danych jest wymagane");
      return;
    }

    // Rozpoczynamy wysyłkę danych
    setIsSubmitting(true);
    try {
      // Integracja z API/bazą danych
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          acceptedTerms: consent,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił nieznany błąd");
      }

      // Zapisujemy dane w store
      updateFormData({
        alternativeEmail: email,
        alternativeConsent: consent,
        submissionId: data.submissionId, // Zapisujemy ID zgłoszenia
      });

      // Ustawiamy ID zgłoszenia do wyświetlenia
      if (data.submissionId) {
        setSubmissionId(data.submissionId);
      }

      // Oznaczamy sukces
      setIsSuccess(true);
    } catch (err) {
      console.error("Błąd podczas zapisywania:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Wystąpił błąd podczas zapisywania. Spróbuj ponownie."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={2} totalSteps={2} />

          <div className="space-y-6">
            <h1 className="text-2xl font-bold">
              Gdzie jesteśmy i jak możemy Ci pomóc
            </h1>

            {isSuccess ? (
              <div className="space-y-4">
                <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-green-800 mb-2">
                    Zapisano pomyślnie!
                  </h2>{" "}
                  <p className="text-gray-700 mb-4">
                    Dziękujemy za zapisanie się na powiadomienia. Poinformujemy
                    Cię, gdy raporty będą dostępne.
                  </p>
                  {submissionId && (
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        ID Twojego zgłoszenia:
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-md flex-1">
                          {submissionId}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyToClipboard}
                        className={
                          copySuccess
                            ? "text-green-600 border-green-600"
                            : "text-blue-600"
                        }
                      >
                        {copySuccess ? "Skopiowano!" : "Kopiuj"}
                      </Button>
                      <p className="text-xs text-gray-500 mt-1">
                        Zachowaj to ID - może być potrzebne w przypadku kontaktu
                        z nami.
                      </p>
                    </div>
                  )}
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <p className="font-semibold mb-2">
                      Chcesz dodatkowo wesprzeć rozwój AliMatrixa?
                    </p>
                    <p className="text-sm mb-2">
                      Jeśli masz ochotę – możesz również pomóc nam przyspieszyć
                      powstanie pierwszych raportów. Każde wsparcie, nawet
                      symboliczne, realnie wpływa na szybkość tworzenia
                      narzędzia, które może zmienić sposób ustalania alimentów w
                      Polsce.
                    </p>
                    <Button
                      variant="secondary"
                      className="mt-2 bg-pink-500 hover:bg-pink-600 text-white w-full"
                      onClick={() =>
                        window.open("https://zrzutka.pl", "_blank")
                      }
                    >
                      Przejdź do wsparcia na zrzutka.pl
                    </Button>
                  </div>
                  <Button onClick={() => router.push("/")} className="mt-2">
                    Wróć do strony głównej
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-sky-950">
                <p>Dziękujemy za Twoje zainteresowanie AliMatrixem!</p>
                <p>
                  Aktualnie koncentrujemy się na zbieraniu danych od osób, które
                  już mają ustalone zasady finansowego wspierania dzieci. Dzięki
                  temu wkrótce powstaną pierwsze raporty dostępne także dla osób
                  w Twojej sytuacji.
                </p>
                <p>
                  Twój udział i Twoje zainteresowanie mają realne znaczenie – im
                  szybciej zbudujemy pełną bazę danych, tym szybciej stworzymy
                  narzędzie, które pomoże Ci lepiej ocenić Twoje możliwości i
                  opcje.
                </p>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">
                    Zostaw e-mail, aby otrzymać powiadomienie
                  </p>
                  <p>
                    Jeśli chcesz otrzymać powiadomienie, gdy raporty dla Twojej
                    sytuacji będą gotowe – zostaw swój adres e-mail. Dzięki temu
                    jako pierwszy(a) dowiesz się o możliwości skorzystania z
                    wyników analizy.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center">
                      Adres e-mail
                      <InfoTooltip
                        content={
                          <div className="space-y-2 text-sm">
                            <p>
                              Twój e-mail będzie używany wyłącznie do wysłania
                              Ci powiadomienia o gotowości raportów. Nie
                              będziemy przesyłać żadnych reklam ani udostępniać
                              Twojego adresu osobom trzecim. Dane kontaktowe
                              przechowujemy oddzielnie od danych analitycznych,
                              z zachowaniem zasad RODO.
                            </p>
                          </div>
                        }
                      />
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="twoj@email.pl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={error && !email ? "border-red-500" : ""}
                    />
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) =>
                        setConsent(checked as boolean)
                      }
                      className={error && !consent ? "border-red-500" : ""}
                    />
                    <Label
                      htmlFor="consent"
                      className="text-sm text-gray-600 cursor-pointer"
                    >
                      Wyrażam zgodę na przetwarzanie danych osobowych zgodnie z
                      RODO
                    </Label>
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>

                <p className="text-center font-semibold">
                  Dziękujemy, że jesteś częścią tej zmiany!
                </p>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push("/sciezka")}
                  >
                    Wstecz
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Zapisywanie..." : "Zapisz się"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
