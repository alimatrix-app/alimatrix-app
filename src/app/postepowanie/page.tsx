"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStore } from "@/lib/store/form-store";
import { generateCSRFToken, storeCSRFToken } from "@/lib/client-security";
import {
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";

export default function Postepowanie() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();

  // CSRF token initialization - zapobiega atakom CSRF
  const csrfInitialized = useRef(false);

  useEffect(() => {
    if (!csrfInitialized.current) {
      const operationId = generateOperationId();
      trackedLog(
        operationId,
        "Initializing CSRF protection for postepowanie router"
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

      trackedLog(operationId, "CSRF protection initialized successfully");
    }
  }, [updateFormData]);
  // Bezpieczny routing z walidacją i logowaniem
  useEffect(() => {
    const operationId = generateOperationId();

    // Sprawdzamy, czy mamy informację o wariancie
    if (!formData.wariantPostepu) {
      trackedLog(
        operationId,
        "No postepowanie variant found, redirecting to podstawa-ustalen"
      );
      // Jeśli nie ma informacji o wariancie, przekierowujemy do strony podstawy ustaleń
      router.push("/podstawa-ustalen");
      return;
    }

    // Bezpieczne przekierowanie do odpowiedniego wariantu z walidacją
    const validVariants = ["court", "agreement", "other"];
    if (!validVariants.includes(formData.wariantPostepu)) {
      trackedLog(
        operationId,
        `Invalid postepowanie variant: ${formData.wariantPostepu}, redirecting to podstawa-ustalen`
      );
      router.push("/podstawa-ustalen");
      return;
    }

    // Przekierowujemy do odpowiedniego wariantu
    switch (formData.wariantPostepu) {
      case "court":
        trackedLog(operationId, "Routing to court proceedings");
        router.push("/postepowanie/sadowe");
        break;
      case "agreement":
        trackedLog(operationId, "Routing to agreement proceedings");
        router.push("/postepowanie/porozumienie");
        break;
      case "other":
        trackedLog(operationId, "Routing to other proceedings");
        router.push("/postepowanie/inne");
        break;
      default:
        // W razie nieprawidłowych danych, wracamy do podstawy ustaleń
        trackedLog(operationId, "Fallback redirect to podstawa-ustalen");
        router.push("/podstawa-ustalen");
    }
  }, [formData.wariantPostepu, router]);
  // Ten komponent nie renderuje żadnego UI, służy tylko do bezpiecznego przekierowania
  // z odpowiednim logowaniem i walidacją bezpieczeństwa
  return null;
}
