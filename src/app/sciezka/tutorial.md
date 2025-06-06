# ANALIZA KODU: /sciezka/page.tsx - Tutorial Bezpieczeństwa i Wydajności

## 📋 SPIS TREŚCI

1. [Przegląd Ogólny](#przegląd-ogólny)
2. [Analiza Importów](#analiza-importów)
3. [Komponent PathOption - Analiza](#komponent-pathoption)
4. [Główny Komponent - Analiza Linia po Linii](#główny-komponent)
5. [Problemy Bezpieczeństwa](#problemy-bezpieczeństwa)
6. [Problemy Wydajności](#problemy-wydajności)
7. [Rekomendacje Ulepszeń](#rekomendacje-ulepszeń)
8. [Plan Implementacji](#plan-implementacji)

---

## 📊 PRZEGLĄD OGÓLNY

**Plik:** `src/app/sciezka/page.tsx`  
**Linie kodu:** 385  
**Typ:** Client-side React component z zaawansowaną logiką  
**Główna funkcja:** Pierwszy krok formularza - wybór ścieżki postępowania

### 🎯 Cel Komponenty

Komponent implementuje logikę wyboru między dwoma ścieżkami:

- `established` - zasady finansowania już ustalone
- `not-established` - zasady nie zostały ustalone

---

## 🔍 ANALIZA IMPORTÓW

```tsx
// Linia 1: "use client" - Next.js 13+ App Router directive
"use client";
```

**Analiza:** Wymusza renderowanie po stronie klienta. ✅ **PRAWIDŁOWE** - komponent używa hooks i interakcji.

```tsx
// Linie 3-8: UI Components
import { Logo } from "@/components/ui/custom/Logo";
import { FormProgress } from "@/components/ui/custom/FormProgress";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InfoTooltip } from "@/components/ui/custom/InfoTooltip";
```

**Analiza:** Standardowe importy UI. ✅ **PRAWIDŁOWE** - wszystkie używane w komponencie.

```tsx
// Linie 10-11: Store i Navigation
import { useFormStore } from "@/lib/store/form-store";
import { useRouter } from "next/navigation";
```

**Analiza:** ✅ **PRAWIDŁOWE** - Next.js router i Zustand store.

```tsx
// Linia 12: React Hooks
import { useState, useEffect, useCallback, memo, useRef } from "react";
```

**Analiza:** ✅ **PRAWIDŁOWE** - wszystkie hooks są używane.

```tsx
// Linie 13-17: Security Layer
import {
  generateCSRFToken,
  storeCSRFToken,
  safeToSubmit,
  recordSubmission,
} from "@/lib/client-security";
```

**Analiza:** ⚠️ **PROBLEM** - Client-side only security (podatne na bypass).

```tsx
// Linie 18-23: Form Handlers
import {
  safeNavigate,
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";
```

**Analiza:** ✅ **DOBRE** - utility functions dla navigation i error handling.

```tsx
// Linia 24: Validation Schema
import { pathSelectionSchema } from "@/lib/schemas/paths-schema";
```

**Analiza:** ✅ **PRAWIDŁOWE** - Zod schema validation.
import { useFormStore } from "@/lib/store/form-store";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, memo, useRef } from "react";

````
**Analiza:**
- `useFormStore` - Zustand store dla persystencji danych formularza
- `useRouter` - Next.js App Router navigation
- **React hooks:** Kompletny zestaw dla zaawansowanego state management
- **memo** - optymalizacja performance przez memoization

### Linie 14-18: Client Security
```tsx
import {
  generateCSRFToken,
  storeCSRFToken,
  safeToSubmit,
  recordSubmission,
} from "@/lib/client-security";
````

**Analiza:**

- **CSRF Protection:** `generateCSRFToken`, `storeCSRFToken`
- **Rate Limiting:** `safeToSubmit`, `recordSubmission`
- **🚨 KRYTYCZNY PROBLEM:** Client-side only security = podatność na bypass

### Linie 19-24: Form Handlers

```tsx
import {
  safeNavigate,
  generateOperationId,
  trackedLog,
  retryOperation,
} from "@/lib/form-handlers";
import { pathSelectionSchema } from "@/lib/schemas/paths-schema";
```

**Analiza:**

- **Navigation Safety:** `safeNavigate` zapobiega race conditions
- **Debugging:** `generateOperationId`, `trackedLog` dla trackowania operacji
- **Resilience:** `retryOperation` dla operacji mogących się nie powieść
- **Validation:** Zod schema dla type-safe walidacji

---

## 🧩 Komponent PathOption

### Linie 26-66: Memoizowany Komponent Opcji

```tsx
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
```

**Analiza TypeScript Interface:**

- **Pozytyw:** Pełne typowanie props
- **Problem:** Inline interface zamiast exported type
- **Performance:** `memo()` zapobiega re-renderom

### Linie 67-80: JSX Structure

```tsx
    <div
      className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? "border-sky-950 bg-sky-50"
          : "border-gray-200 hover:border-blue-300"
      }`}
      onClick={() => onSelect(id)}
    >
```

**Analiza CSS i UX:**

- **Accessibility:** Proper cursor pointer i visual feedback
- **Problem:** Brak `role` i `aria-label` dla screen readers
- **Styling:** Dynamic className z conditional logic

### Linie 81-97: Checkbox i Labels

```tsx
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
```

**Analiza Accessibility:**

- **Pozytyw:** `htmlFor` linking label z checkbox
- **Pozytyw:** `id` attribute dla proper form association
- **Problem:** Redundant `onCheckedChange` i `onClick` handlers

---

## 🏗️ Główny Komponent WyborSciezki

### Linie 102-106: Podstawowa Inicjalizacja

```tsx
export default function WyborSciezki() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();
  const secureStore = useFormStore();
```

**Analiza:**

- **Problem:** Podwójne wywołanie `useFormStore()` - niepotrzebne
- **Naming:** `secureStore` is misleading - to ten sam store

### Linie 107-122: CSRF Token Setup

```tsx
// CSRF token initialization
const csrfInitialized = useRef(false);
useEffect(() => {
  if (!csrfInitialized.current) {
    const token = generateCSRFToken();
    storeCSRFToken(token);
    secureStore.updateFormData({
      __meta: {
        csrfToken: token,
        lastUpdated: Date.now(),
        formVersion: "1.1.0",
      },
    });
    csrfInitialized.current = true;
  }
}, []);
```

**Analiza Security Setup:**

- **Pozytyw:** `useRef` zapobiega wielokrotnej inicjalizacji
- **Pozytyw:** Metadata tracking z `formVersion` i `lastUpdated`
- **🚨 PROBLEM:** CSRF token w client-side storage = dostępny dla XSS
- **Problem:** Empty dependency array bez `secureStore`

### Linie 124-135: State Management

```tsx
// Inicjalizacja stanu wybranej opcji z danych formularza (jeśli istnieją)
const [selectedOption, setSelectedOption] = useState<string | null>(
  (formData.sciezkaWybor as string) || null
);

// Stan błędu do walidacji
const [error, setError] = useState<string | null>(null);

// Stan przycisku do zapobiegania wielokrotnym kliknięciom
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Analiza State:**

- **Pozytyw:** Type casting z fallback `|| null`
- **Pozytyw:** Separate error state dla user feedback
- **Pozytyw:** `isSubmitting` zapobiega double-submit
- **Problem:** Brak loading states dla lepszego UX

### Linie 137-142: Dependency Effect

```tsx
// Efekt do sprawdzania zależności
useEffect(() => {
  if (selectedOption) {
    setError(null);
  }
}, [selectedOption]);
```

**Analiza:**

- **Pozytyw:** Automatyczne czyszczenie błędów przy zmianie selection
- **Pozytyw:** Proper dependency array

### Linie 144-147: Memoized Handler

```tsx
// Handler wyboru opcji (memoizowany dla wydajności)
const handleOptionSelect = useCallback((optionId: string) => {
  setSelectedOption(optionId);
  setError(null);
}, []); // Funkcja do obsługi przejścia do następnego kroku
```

**Analiza:**

- **Pozytyw:** `useCallback` dla performance optimization
- **Problem:** Empty dependency array - może być problematyczne

### Linie 148-163: Submit Handler Start

```tsx
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
```

**Analiza Guard Logic:**

- **Pozytyw:** Double protection - `isSubmitting` + `safeToSubmit()`
- **Pozytyw:** Detailed logging dla debugging
- **Pozytyw:** Unique operation IDs dla trackowania

### Linie 165-185: Validation Logic

```tsx
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
```

**Analiza Validation:**

- **Pozytyw:** Zod `safeParse` nie throw errors
- **Pozytyw:** Proper error formatting z fallback message
- **Pozytyw:** User-friendly error messages w języku polskim
- **Problem:** Logging sensitive data może być GDPR issue

### Linie 187-221: Data Persistence Logic

```tsx
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
  trackedLog(operationId, "Data saved successfully and submission recorded");
} catch (updateError) {
  // ... backup save logic
}
```

**Analiza Persistence:**

- **Pozytyw:** Retry mechanism z exponential backoff
- **Pozytyw:** Metadata tracking z timestamps
- **Pozytyw:** Backup save strategy
- **Problem:** Zustand store tylko w localStorage = podatny na data loss

### Linie 250-261: Navigation Logic

```tsx
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
```

**Analiza Navigation:**

- **Pozytyw:** `safeNavigate` z delay zapobiega race conditions
- **Problem:** Hardcoded routes - powinny być w constants
- **Problem:** Brak error handling dla navigation failures

### Linie 262-276: Error Handling

```tsx
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
```

**Analiza Error Handling:**

- **Pozytyw:** Generic user message (nie pokazuje technical details)
- **Pozytyw:** `finally` block zapewnia cleanup
- **Pozytyw:** Proper dependency array w `useCallback`

---

## 🧩 KOMPONENT PATHOPTION

```tsx
// Linie 26-65: Memoizowany komponent opcji
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
```

### 📈 Analiza PathOption:

**✅ ZALETY:**

- `memo()` - optymalizacja re-renderów
- TypeScript interfaces - type safety
- Proper props destructuring

**⚠️ PROBLEMY:**

- `tooltipContent` jako `React.ReactNode` - **XSS RISK** jeśli zawiera user input
- Brak sanitization HTML content
- Inline styles w className (maintainability)

```tsx
// Linie 45-49: Checkbox Integration
<Checkbox
  id={id}
  checked={isSelected}
  onCheckedChange={() => onSelect(id)}
  className="mt-1"
/>
```

**Analiza:** ✅ **PRAWIDŁOWE** - proper controlled component pattern.

```tsx
// Linie 54-55: Dangerous HTML rendering
<InfoTooltip content={tooltipContent} />
```

**Analiza:** 🚨 **KRYTYCZNE** - Jeśli `tooltipContent` zawiera user input, możliwy XSS.

---

## 🏗️ GŁÓWNY KOMPONENT - ANALIZA LINIA PO LINII

### Inicjalizacja State i Hooks

```tsx
// Linie 70-72: Router i Store
export default function WyborSciezki() {
  const router = useRouter();
  const { formData, updateFormData } = useFormStore();
  const secureStore = useFormStore();
```

**🚨 PROBLEM:** Podwójne wywołanie `useFormStore()` - **memory leak** i niepotrzebne re-renders.

**✅ POPRAWA:**

```tsx
const { formData, updateFormData } = useFormStore();
// usuń: const secureStore = useFormStore();
```

### CSRF Token Initialization

```tsx
// Linie 73-89: CSRF Setup
const csrfInitialized = useRef(false);
useEffect(() => {
  if (!csrfInitialized.current) {
    const token = generateCSRFToken();
    storeCSRFToken(token);
    secureStore.updateFormData({
      __meta: {
        csrfToken: token,
        lastUpdated: Date.now(),
        formVersion: "1.1.0",
      },
    });
    csrfInitialized.current = true;
  }
}, []);
```

**🚨 KRYTYCZNE PROBLEMY:**

1. Client-side only CSRF - **łatwo można bypass**
2. Token w localStorage - **accessible via XSS**
3. Hardcoded formVersion - **maintainability issue**
4. Brak dependency array validation

**✅ BEZPIECZNA IMPLEMENTACJA:**

```tsx
// Server-side CSRF z httpOnly cookies
useEffect(() => {
  fetch("/api/csrf-token", {
    method: "POST",
    credentials: "include", // httpOnly cookie
  });
}, []);
```

### State Management

```tsx
// Linie 91-93: Selected Option State
const [selectedOption, setSelectedOption] = useState<string | null>(
  (formData.sciezkaWybor as string) || null
);
```

**Analiza:** ✅ **PRAWIDŁOWE** - type casting z fallback.

```tsx
// Linie 95-96: Error State
const [error, setError] = useState<string | null>(null);
```

**Analiza:** ✅ **PRAWIDŁOWE** - error state management.

```tsx
// Linie 98-99: Submission State
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Analiza:** ✅ **PRAWIDŁOWE** - prevent double submission.

### Effect Hooks

```tsx
// Linie 101-105: Error Clearing Effect
useEffect(() => {
  if (selectedOption) {
    setError(null);
  }
}, [selectedOption]);
```

**Analiza:** ✅ **PRAWIDŁOWE** - clear error on selection change.

### Event Handlers

```tsx
// Linie 107-110: Option Select Handler
const handleOptionSelect = useCallback((optionId: string) => {
  setSelectedOption(optionId);
  setError(null);
}, []);
```

**Analiza:** ✅ **PRAWIDŁOWE** - memoized callback, proper dependencies.

### 🚨 KRYTYCZNA ANALIZA: handleNext Function

```tsx
// Linie 111-218: Main Form Submission Logic
const handleNext = useCallback(async () => {
  // Linie 112-118: Double Submission Prevention
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
```

**⚠️ PROBLEMY:**

1. `trackedLog` - **może logować sensitive data** (GDPR issue)
2. Client-side only rate limiting - **można bypass**

```tsx
// Linie 120-122: Operation ID Generation
const operationId = generateOperationId();
trackedLog(operationId, "Starting form submission process");
setIsSubmitting(true);
```

**⚠️ PROBLEMY:**

1. **Predictable operation IDs** - security risk
2. **Verbose logging** - performance impact

```tsx
// Linie 125-142: Zod Validation
trackedLog(operationId, "Validating form data", {
  sciezkaWybor: selectedOption,
});
const validationResult = pathSelectionSchema.safeParse({
  sciezkaWybor: selectedOption,
});

if (!validationResult.success) {
  const formattedErrors = validationResult.error.format();
  const errorMessage =
    formattedErrors._errors?.[0] || "Proszę wybrać jedną z opcji";
  trackedLog(operationId, "Validation failed", errorMessage, "warn");
  setError(errorMessage);
  setIsSubmitting(false);
  return;
}
```

**✅ ZALETY:**

- Proper Zod validation
- User-friendly error messages
- Safe error parsing

**⚠️ PROBLEMY:**

- **Logging user data** - GDPR compliance issue
- Client-side only validation - **można bypass**

```tsx
// Linie 146-190: Data Persistence with Retry Logic
try {
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
  trackedLog(operationId, "Data saved successfully and submission recorded");
} catch (updateError) {
  // ... backup save logic
}
```

**✅ ZALETY:**

- Retry mechanism z exponential backoff
- Proper error handling
- Metadata tracking

**⚠️ PROBLEMY:**

- **Hardcoded formVersion** - maintainability
- **Complex nested try-catch** - error handling complexity

```tsx
// Linie 192-213: Navigation Logic
if (selectedOption === "established") {
  await safeNavigate(() => router.push("/finansowanie"), undefined, 150);
} else {
  await safeNavigate(() => router.push("/alternatywna"), undefined, 150);
}
```

**✅ ZALETY:**

- Safe navigation with delay
- Proper conditional routing

---

## 🚨 PROBLEMY BEZPIECZEŃSTWA

### 1. XSS (Cross-Site Scripting) Vulnerabilities

```tsx
// PROBLEM: Niezasanityzowany content w tooltipach
<InfoTooltip content={tooltipContent} />
```

**Ryzyko:** Wykonanie złośliwego JavaScript
**Rozwiązanie:** Implementacja DOMPurify

### 2. CSRF Protection Inadequate

```tsx
// PROBLEM: Client-side only CSRF
const token = generateCSRFToken();
storeCSRFToken(token); // localStorage - accessible via XSS
```

**Ryzyko:** Bypass protection, token theft
**Rozwiązanie:** Server-side CSRF z httpOnly cookies

### 3. Data Logging GDPR Issues

```tsx
// PROBLEM: Logowanie danych użytkownika
trackedLog(operationId, "Validating form data", {
  sciezkaWybor: selectedOption, // USER DATA!
});
```

**Ryzyko:** GDPR non-compliance, data leaks
**Rozwiązanie:** Anonymizacja lub usunięcie logowania user data

### 4. Client-Side Validation Only

```tsx
// PROBLEM: Tylko client-side validation
const validationResult = pathSelectionSchema.safeParse({
  sciezkaWybor: selectedOption,
});
```

**Ryzyko:** Bypass validation attacks
**Rozwiązanie:** Server-side validation duplication

---

## ⚡ PROBLEMY WYDAJNOŚCI

### 1. Memory Leaks

```tsx
// PROBLEM: Podwójne wywołanie store
const { formData, updateFormData } = useFormStore();
const secureStore = useFormStore(); // DUPLICATE!
```

**Impact:** Unnecessary re-renders, memory usage
**Fix:** Usuń duplikat

### 2. Excessive Logging

```tsx
// PROBLEM: Verbose logging w produkcji
trackedLog(operationId, "Starting form submission process");
trackedLog(operationId, "Validating form data", {...});
// ... 8 więcej trackedLog calls
```

**Impact:** Performance degradation, log spam
**Fix:** Environment-based logging

### 3. Complex Nested Operations

```tsx
// PROBLEM: Zagnieżdżone try-catch z retry logic
try {
  await retryOperation(async () => {
    try {
      await updateFormData({...});
    } catch (updateError) {
      try {
        await updateFormData({...}); // BACKUP SAVE
      } catch (finalError) {
        throw finalError;
      }
    }
  });
}
```

**Impact:** Complex error handling, debugging difficulty
**Fix:** Simplified error handling strategy

---

## 🔧 REKOMENDACJE ULEPSZEŃ

### 🚨 KRYTYCZNY PRIORYTET (Bezpieczeństwo)

#### 1. Server-Side CSRF Protection

```tsx
// Nowa implementacja
useEffect(() => {
  const initCSRF = async () => {
    try {
      await fetch("/api/csrf-init", {
        method: "POST",
        credentials: "include", // httpOnly cookie
      });
    } catch (error) {
      console.error("CSRF initialization failed");
    }
  };
  initCSRF();
}, []);
```

#### 2. XSS Protection z DOMPurify

```tsx
import DOMPurify from "dompurify";

// Bezpieczne renderowanie tooltipów
const SafeTooltip = ({ content }: { content: string }) => (
  <InfoTooltip
    content={
      <div
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(content),
        }}
      />
    }
  />
);
```

#### 3. Server-Side Validation

```tsx
// Nowy API endpoint: /api/validate-path-selection
const validateOnServer = async (data: PathSelection) => {
  const response = await fetch("/api/validate-path-selection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Server validation failed");
  }

  return response.json();
};
```

### 🔧 WYSOKI PRIORYTET (Performance)

#### 4. Memory Leak Fix

```tsx
// PRZED (problematyczne)
const { formData, updateFormData } = useFormStore();
const secureStore = useFormStore(); // DUPLICATE

// PO (optymalne)
const store = useFormStore();
const { formData, updateFormData } = store;
```

#### 5. Environment-Based Logging

```tsx
const isDevelopment = process.env.NODE_ENV === "development";

const trackedLog = (...args: any[]) => {
  if (isDevelopment) {
    console.log(...args);
  }
  // W produkcji: wysyłaj tylko critical errors do monitoring
};
```

#### 6. Simplified Error Handling

```tsx
const handleDataSave = async (data: PathSelection) => {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await updateFormData(data);
      return; // Success
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
      }
    }
  }

  throw lastError; // All retries failed
};
```

### 🎯 ŚREDNI PRIORYTET (Maintainability)

#### 7. Configuration Management

```tsx
// config/form.ts
export const FORM_CONFIG = {
  VERSION: '1.2.0',
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 100,
  NAVIGATION_DELAY: 150
} as const;

// Użycie w komponencie
import { FORM_CONFIG } from '@/config/form';

__meta: {
  formVersion: FORM_CONFIG.VERSION,
  lastUpdated: Date.now(),
}
```

#### 8. TypeScript Improvements

```tsx
// types/form.ts
export type PathSelection = "established" | "not-established";
export type FormMetadata = {
  lastUpdated: number;
  formVersion: string;
  csrfToken?: string;
};

export interface PathFormData {
  sciezkaWybor: PathSelection;
  __meta: FormMetadata;
}
```

#### 9. Component Splitting

```tsx
// components/PathSelection/index.tsx
export { PathSelectionForm } from "./PathSelectionForm";
export { PathOption } from "./PathOption";
export { PathTooltips } from "./PathTooltips";

// Podział na mniejsze, bardziej maintainable komponenty
```

---

## 📋 PLAN IMPLEMENTACJI

### FAZA 1: SECURITY FIXES (Krytyczne - 1-2 dni)

- [ ] **Server-side CSRF protection** - `/api/csrf-init`
- [ ] **XSS protection** - DOMPurify integration
- [ ] **Server-side validation** - `/api/validate-path-selection`
- [ ] **Remove user data logging** - GDPR compliance

### FAZA 2: PERFORMANCE OPTIMIZATION (1 dzień)

- [ ] **Fix memory leaks** - usuń podwójne useFormStore()
- [ ] **Environment-based logging** - tylko dev w konsoli
- [ ] **Simplified error handling** - jeden try-catch pattern

### FAZA 3: CODE QUALITY (1-2 dni)

- [ ] **Configuration management** - externalize constants
- [ ] **TypeScript improvements** - strict types
- [ ] **Component splitting** - smaller, focused components

### FAZA 4: TESTING & MONITORING (1 dzień)

- [ ] **Unit tests** - critical path testing
- [ ] **Security tests** - XSS/CSRF prevention
- [ ] **Performance monitoring** - memory usage tracking

### FAZA 5: DOCUMENTATION (0.5 dnia)

- [ ] **Code comments** - complex logic explanation
- [ ] **Security documentation** - threat model
- [ ] **Performance guidelines** - best practices

### FAZA 6: DEPLOYMENT & VALIDATION (0.5 dnia)

- [ ] **Staged deployment** - security validation
- [ ] **A/B testing** - performance comparison
- [ ] **Security audit** - final verification

---

## 📊 SECURITY SCORECARD

| Kategoria            | Obecny Stan | Docelowy Stan | Priorytet |
| -------------------- | ----------- | ------------- | --------- |
| **XSS Protection**   | 2/10 ⚠️     | 9/10 ✅       | KRYTYCZNY |
| **CSRF Protection**  | 3/10 ⚠️     | 9/10 ✅       | KRYTYCZNY |
| **Input Validation** | 6/10 🔶     | 9/10 ✅       | WYSOKI    |
| **Data Logging**     | 3/10 ⚠️     | 8/10 ✅       | WYSOKI    |
| **Error Handling**   | 7/10 🔶     | 8/10 ✅       | ŚREDNI    |

**OBECNY SECURITY SCORE: 4.2/10** 🚨  
**DOCELOWY SECURITY SCORE: 8.6/10** ✅

---

## 🎯 KLUCZOWE WNIOSKI

### ✅ CO DZIAŁA DOBRZE:

1. **Zod validation** - solid client-side validation
2. **Retry mechanism** - robust error recovery
3. **Memoization** - proper React optimization
4. **TypeScript usage** - good type safety
5. **Loading states** - good UX feedback

### 🚨 CO WYMAGA NATYCHMIASTOWEJ NAPRAWY:

1. **Client-only security** - łatwo można bypass
2. **XSS vulnerabilities** - krytyczne zagrożenie
3. **GDPR violations** - logowanie user data
4. **Memory leaks** - podwójne store wywołania
5. **Performance issues** - excessive logging

### 🔧 DŁUGOTERMINOWE ULEPSZENIA:

1. **Server-side architecture** - pełna security layer
2. **Component architecture** - podział na mniejsze części
3. **Configuration management** - externalized settings
4. **Monitoring & Analytics** - security & performance tracking
5. **Automated testing** - security & performance tests

---

**REKOMENDACJA:** Rozpocznij implementację od **FAZY 1 (Security Fixes)** - to są krytyczne problemy bezpieczeństwa, które mogą narazić aplikację na ataki. Pozostałe fazy można implementować równolegle lub sekwencyjnie w zależności od zasobów zespołu.
