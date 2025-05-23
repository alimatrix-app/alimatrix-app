"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/custom/Logo";
import { SecurityBanner } from "@/components/ui/custom/SecurityBanner";
import Link from "next/link";
import { useFormStore } from "@/lib/store/form-store";
import { FormProgress } from "@/components/ui/custom/FormProgress";

export default function ThankYouPage() {
  const { formData, resetForm } = useFormStore();
  const [submissionId, setSubmissionId] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Pobierz ID zgłoszenia z URL lub z formData
  useEffect(() => {
    let id = "";

    // Sprawdź URL
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      id = urlParams.get("id") || "";
    }

    // Jeśli nie ma w URL, sprawdź formData
    if (!id && formData.submissionId) {
      id = formData.submissionId;
    }

    setSubmissionId(id);

    // Resetuj formularz przy wejściu na stronę podziękowania z opóźnieniem
    const timeoutId = setTimeout(() => {
      resetForm();
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [formData, resetForm]);

  // Funkcja do kopiowania ID do schowka
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

  return (
    <main className="flex justify-center p-3">
      <Card className="w-full max-w-lg shadow-lg border-sky-100">
        <CardContent className="pt-2">
          <div className="text-center pb-4">
            <Logo className="inline-block" size="large" />
          </div>
          <FormProgress currentStep={12} totalSteps={12} />
          <div className="text-center space-y-6 py-8">
            {" "}
            <div className="inline-flex justify-center items-center w-20 h-20 bg-green-100 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold">Zgłoszenie zostało przyjęte!</h1>
            <div className="bg-green-50 border border-green-200 p-5 rounded-lg my-6 shadow-sm">
              <p className="flex items-center justify-center gap-2 text-green-800 font-medium mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Operacja zakończona sukcesem
              </p>
              <p className="text-green-700 mt-2">
                Twój formularz został pomyślnie wysłany i zapisany w naszej
                bazie danych. Dziękujemy za wypełnienie formularza!
              </p>
            </div>{" "}
            {submissionId && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg my-6 shadow-sm">
                <p className="text-sm font-semibold text-blue-800 mb-2">
                  Numer Twojego zgłoszenia:
                </p>
                <div className="flex items-center gap-2 bg-white p-3 rounded border border-gray-200">
                  <span className="font-mono text-md flex-1 text-blue-900">
                    {submissionId}
                  </span>
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
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  Zachowaj ten numer - może być potrzebny w przypadku kontaktu z
                  nami.
                </p>
              </div>
            )}{" "}
            <div className="space-y-4">
              <p className="text-gray-700">
                Twój raport jest już przygotowywany. Wyślemy go na podany adres
                e-mail.
              </p>

              <p className="text-gray-700">
                Jeśli masz jakiekolwiek pytania lub nie otrzymasz raportu,
                skontaktuj się z nami pod adresem{" "}
                <a
                  href="mailto:kontakt@alimatrix.pl"
                  className="text-blue-600 hover:underline"
                >
                  kontakt@alimatrix.pl
                </a>
                .
              </p>
            </div>
            <div className="bg-pink-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">
                Chcesz dodatkowo wesprzeć rozwój AliMatrixa?
              </p>
              <p className="text-sm mb-2">
                Jeśli masz ochotę – możesz również pomóc nam przyspieszyć
                powstanie pierwszych raportów. Każde wsparcie, nawet
                symboliczne, realnie wpływa na szybkość tworzenia narzędzia,
                które może zmienić sposób ustalania alimentów w Polsce.
              </p>
              <Button
                variant="secondary"
                className="mt-2 bg-pink-500 hover:bg-pink-600 text-white w-full"
                onClick={() => window.open("https://zrzutka.pl", "_blank")}
              >
                Przejdź do wsparcia na zrzutka.pl
              </Button>
            </div>
            <SecurityBanner className="mt-6" />
            <div className="pt-6">
              <Link href="/">
                <Button className="w-full">Powrót do strony głównej</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
