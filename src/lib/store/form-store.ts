import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { obfuscateData, deobfuscateData } from "../client-security";

// Rozszerzona definicja typów dla danych formularza
export type FormData = {
  // Krok 1: Wybór ścieżki
  sciezkaWybor?: "established" | "not-established";

  // Dane dla ścieżki alternatywnej
  alternativeEmail?: string;
  alternativeConsent?: boolean;
  // ID zgłoszenia generowane przez system
  submissionId?: string;
  // Flaga wskazująca czy zgłoszenie zapisano w trybie offline
  isOfflineSubmission?: boolean;

  // Śledzenie postępu wypełniania formularza dla dzieci
  aktualneDzieckoIndex?: number; // Indeks aktualnie wypełnianego dziecka
  zakonczoneIndeksyDzieci?: number[]; // Indeksy dzieci, dla których został ukończony cykl wypełniania

  // Krok 3: Podstawa ustaleń
  podstawaUstalen?: string;
  podstawaUstalenInne?: string;
  wariantPostepu?: "court" | "agreement" | "other"; // Kategoria dla kroku 9

  // Krok 4: Sposób finansowania potrzeb dziecka
  sposobFinansowania?: "i-pay" | "i-receive" | "shared";

  // Krok 9: Oceny adekwatności postępowania
  ocenaAdekwatnosciSad?: number;
  ocenaAdekwatnosciPorozumienie?: number;
  ocenaAdekwatnosciInne?: number; // Krok 9: Dane postępowania sądowego
  dataDecyzjiSad?: string;
  rokDecyzjiSad?: string;
  miesiacDecyzjiSad?: string;
  rodzajSaduSad?: "rejonowy" | "okregowy" | "nie_pamietam";
  apelacjaSad?: string;
  // Nowa hierarchiczna struktura sądów
  apelacjaId?: string;
  apelacjaNazwa?: string;
  sadOkregowyId?: string;
  sadOkregowyNazwa?: string;
  sadRejonowyId?: string;
  sadRejonowyNazwa?: string;
  liczbaSedzi?: "jeden" | "trzech";
  plecSedziego?: "kobieta" | "mezczyzna";
  inicjalySedziego?: string;
  czyPozew?: "tak" | "nie";
  watekWiny?: "nie" | "tak-ja" | "tak-druga-strona" | "tak-oboje";

  // Krok 9: Dane porozumienia
  dataPorozumienia?: string;
  sposobPorozumienia?: string;
  formaPorozumienia?: string;
  klauzulaWaloryzacyjna?: string;
  // Krok 9: Dane ustaleń innych
  dataUstalenInnych?: string;
  uzgodnienieFinansowania?: string;
  planyWystapieniaDoSadu?: string;

  // Krok 10: Dane demograficzne - użytkownik
  plecUzytkownika?: string;
  wiekUzytkownika?: string;
  wojewodztwoUzytkownika?: string;
  miejscowoscUzytkownika?: string;
  stanCywilnyUzytkownika?: string;
  // Krok 10: Dane demograficzne - drugi rodzic
  plecDrugiegoRodzica?: string;
  wiekDrugiegoRodzica?: string;
  wojewodztwoDrugiegoRodzica?: string;
  miejscowoscDrugiegoRodzica?: string;

  // Krok 11: Dane kontaktowe i zgody
  contactEmail?: string;
  zgodaPrzetwarzanie?: boolean;
  zgodaKontakt?: boolean;
  // Krok 4: Dzieci
  liczbaDzieci?: number;
  dzieci?: {
    id: number;
    wiek: number;
    plec: "K" | "M" | "I"; // Updated to include "I" (Inna / wolę nie podawać)
    specjalnePotrzeby: boolean;
    opisSpecjalnychPotrzeb?: string;
    uczeszczeDoPlacowki?: boolean;
    typPlacowki?:
      | "zlobek"
      | "przedszkole"
      | "podstawowa"
      | "ponadpodstawowa"
      | "";
    opiekaInnejOsoby?: boolean | null;
    modelOpieki?: "50/50" | "inny"; // Dane związane z tabelą czasu opieki (tylko dla modelu "inny")
    cyklOpieki?: "1" | "2" | "4" | "custom"; // co tydzień, co 2 tygodnie, co 4 tygodnie, brak stałego schematu
    procentCzasuOpieki?: number; // procentowy udział czasu opieki rodzica wypełniającego formularz
    tabelaCzasu?: {
      [dzienTygodnia: string]: {
        // "pn", "wt", "sr", "cz", "pt", "sb", "nd"
        poranek: number;
        placowkaEdukacyjna: number;
        czasPoEdukacji: number;
        senURodzica: number;
        senUDrugiegoRodzica: number;
      };
    };
    wskaznikiCzasuOpieki?: {
      czasOpiekiBezEdukacji: number;
      czasAktywnejOpieki: number;
      czasSnu: number;
    };
    // Dane o kosztach utrzymania i źródłach finansowania
    kwotaAlimentow?: number;
    twojeMiesieczneWydatki?: number;
    wydatkiDrugiegoRodzica?: number;
    kosztyUznanePrzezSad?: number;
    inneZrodlaUtrzymania?: {
      rentaRodzinna: boolean;
      rentaRodzinnaKwota?: number;
      swiadczeniePielegnacyjne: boolean;
      swiadczeniePielegnacyjneKwota?: number;
      inne: boolean;
      inneOpis?: string;
      inneKwota?: number;
      brakDodatkowychZrodel: boolean;
    };
  }[];

  // Stan aktualnego dziecka w tabeli czasu
  aktualneDzieckoWTabeliCzasu?: number;

  // Krok 7: Koszty utrzymania dzieci
  kosztyDzieci?: {
    id: number;
    kwotaAlimentow: number;
    twojeMiesieczneWydatki: number;
    wydatkiDrugiegoRodzica?: number;
    kosztyUznanePrzezSad?: number;
    inneZrodlaUtrzymania: {
      rentaRodzinna: boolean;
      rentaRodzinnaKwota?: number;
      swiadczeniePielegnacyjne: boolean;
      swiadczeniePielegnacyjneKwota?: number;
      inne: boolean;
      inneOpis?: string;
      inneKwota?: number;
      brakDodatkowychZrodel: boolean;
    };
  }[];

  // Krok 8: Dochody i koszty życia rodziców
  dochodyRodzicow?: {
    wlasne: {
      oficjalneDochodyNetto: number;
      potencjalDochodowy: number;
      kosztyUtrzymaniaSiebie: number;
      kosztyUtrzymaniaInnychOsob: number;
      dodatkoweZobowiazania: number;
    };
    drugiRodzic: {
      oficjalneDochodyNetto: number;
      potencjalDochodowy: number;
      kosztyUtrzymaniaSiebie: number;
      kosztyUtrzymaniaInnychOsob: number;
      dodatkoweZobowiazania: number;
    };
  };

  // Metadane dla lepszej obsługi danych
  __meta?: {
    lastUpdated: number;
    formVersion: string;
    csrfToken?: string;
  };
};

// Definicja interfejsu dla store'a
interface FormStore {
  // Dane formularza
  formData: FormData;

  // Akcje
  updateFormData: (data: Partial<FormData>) => Promise<void>;
  resetForm: () => void;
}

// Customowy storage bezpieczniejszy niż standardowy localStorage
const safeLocalStorage = {
  getItem: (name: string): string | null => {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const value = localStorage.getItem(name);

      // Jeśli nie ma wartości, zwróć null
      if (!value) return null;

      // Sprawdź, czy mamy do czynienia z zaszyfrowanymi danymi
      try {
        return deobfuscateData(value);
      } catch (decryptError) {
        console.warn(
          "Failed to deobfuscate, returning original value:",
          decryptError
        );
        return value; // Zwróć oryginalną wartość jeśli deszyfrowanie się nie powiodło
      }
    } catch (error) {
      console.error("Error retrieving from localStorage:", error);
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return;
    }

    try {
      const encoded = obfuscateData(value);
      localStorage.setItem(name, encoded);
    } catch (error) {
      console.error("Error saving to localStorage:", error);
      // Fallback - spróbuj zapisać bez szyfrowania
      try {
        localStorage.setItem(name, value);
      } catch (fallbackError) {
        console.error("Fallback storage also failed:", fallbackError);
      }
    }
  },

  removeItem: (name: string): void => {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error("Error removing from localStorage:", error);
    }
  },
};

// Tworzymy store z użyciem persist middleware do zapisywania w localStorage
export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      formData: {},
      updateFormData: async (data) => {
        try {
          // Zapewnienie unikalnego ID dla bieżącej operacji zapisu dla lepszego debugowania
          const operationId =
            Date.now().toString(36) + Math.random().toString(36).substr(2);
          console.debug(`[${operationId}] Updating form data:`, data);

          // Próba aktualizacji danych z mechanizmem ponawiania przy błędach
          const tryUpdate = async (attempt = 1, maxAttempts = 3) => {
            try {
              set((state) => {
                try {
                  // Głęboka kopia aktualnego stanu z zabezpieczeniem przed błędami
                  let newFormData;
                  try {
                    newFormData = JSON.parse(
                      JSON.stringify({ ...state.formData })
                    );
                  } catch (parseError) {
                    console.warn(
                      `[${operationId}] Error parsing state, using simple copy:`,
                      parseError
                    );
                    newFormData = { ...state.formData };
                  }

                  // Głębokie łączenie (merging) nowych danych z istniejącymi
                  const merged = { ...newFormData };

                  // Specjalna logika dla tablic
                  if (data.dzieci && Array.isArray(data.dzieci)) {
                    // Jeśli dzieci są aktualizowane, zastępujemy całą tablicę
                    merged.dzieci = [...data.dzieci];
                    console.debug(
                      `[${operationId}] Merged dzieci:`,
                      merged.dzieci
                    );
                  }

                  // Dodawanie metadanych
                  merged.__meta = {
                    ...(merged.__meta || {}),
                    lastUpdated: Date.now(),
                    formVersion: "1.1.0",
                    operationId, // Dodanie ID operacji dla śledzenia
                  };

                  // Dodanie csrfToken jeśli został dostarczony
                  if (data.__meta?.csrfToken) {
                    merged.__meta.csrfToken = data.__meta.csrfToken;
                  }

                  // Łączymy resztę danych
                  const result = { formData: { ...merged, ...data } };
                  console.debug(`[${operationId}] Result of merge:`, result);

                  return result;
                } catch (innerError) {
                  console.error(
                    `[${operationId}] Error in state update function:`,
                    innerError
                  );
                  // W przypadku błędu, zwróć niezmodyfikowany stan
                  return state;
                }
              });

              console.debug(`[${operationId}] Update completed successfully`);
              return Promise.resolve();
            } catch (setError) {
              // Jeśli wystąpił błąd i nie przekroczyliśmy limitu prób
              if (attempt < maxAttempts) {
                console.warn(
                  `[${operationId}] Update attempt ${attempt} failed, retrying...`,
                  setError
                );
                // Czekaj przez rosnący czas przed ponowną próbą
                await new Promise((resolve) =>
                  setTimeout(resolve, 100 * attempt)
                );
                return tryUpdate(attempt + 1, maxAttempts);
              }

              // Jeśli wyczerpaliśmy próby, rzuć błąd
              throw setError;
            }
          };

          // Wykonaj aktualizację z mechanizmem ponownych prób
          await tryUpdate();
          return Promise.resolve();
        } catch (error) {
          console.error("Error updating form data after all retries:", error);
          // Ostateczna próba zapisania danych z minimalnym zakresem zmian
          try {
            set((state) => ({
              formData: {
                ...state.formData,
                ...data,
              },
            }));
            console.warn("Executed fallback minimal update");
            return Promise.resolve();
          } catch (fallbackError) {
            console.error(
              "Critical: even fallback update failed:",
              fallbackError
            );
            return Promise.reject(error);
          }
        }
      },

      resetForm: () => set({ formData: {} }),
    }),
    {
      name: "alimatrix-form-storage",
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => state, // Zapisujemy cały stan bez filtrowania
    }
  )
);
