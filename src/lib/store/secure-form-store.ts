import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { FormData } from "./form-store";
import { obfuscateData, deobfuscateData } from "../client-security";

// Definicja interfejsu dla store'a z metadanymi
interface SecureFormStore {
  // Dane formularza
  formData: FormData;

  // Metadane
  metaData: {
    lastUpdated: number;
    version: string;
    csrfToken?: string;
  };

  // Akcje
  updateFormData: (data: Partial<FormData>) => void;
  setMetaData: (data: Partial<SecureFormStore["metaData"]>) => void;
  resetForm: () => void;
  clearAllData: () => void;
}

// Customowy storage z szyfrowaniem
const customStorage = {
  getItem: (name: string) => {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const sessionValue = sessionStorage.getItem(name);
      if (!sessionValue) return null;

      // Próba deszyfrowania wartości
      try {
        return deobfuscateData(sessionValue);
      } catch (decryptError) {
        console.warn(
          "Failed to deobfuscate session data, returning original value:",
          decryptError
        );
        return sessionValue; // Zwróć oryginalną wartość jeśli deszyfrowanie się nie powiodło
      }
    } catch (error) {
      console.error("Error accessing sessionStorage:", error);
      return null;
    }
  },

  setItem: (name: string, value: string) => {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return;
    }

    try {
      const encoded = obfuscateData(value);
      sessionStorage.setItem(name, encoded);
    } catch (error) {
      console.error("Error setting session data:", error);
      // Fallback - spróbuj zapisać bez szyfrowania
      try {
        sessionStorage.setItem(name, value);
      } catch (fallbackError) {
        console.error("Fallback session storage failed:", fallbackError);
      }
    }
  },

  removeItem: (name: string) => {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return;
    }

    try {
      sessionStorage.removeItem(name);
    } catch (error) {
      console.error("Error removing from sessionStorage:", error);
    }
  },
};

// Tworzymy store z użyciem persist middleware do zapisywania w sessionStorage z szyfrowaniem
export const useSecureFormStore = create<SecureFormStore>()(
  persist(
    (set) => ({
      formData: {},
      metaData: {
        lastUpdated: Date.now(),
        version: "1.1.0",
      },

      updateFormData: (data) =>
        set((state) => {
          try {
            console.debug("Securely updating form data:", data);

            // Deep copy of current state for immutability
            const newFormData = JSON.parse(
              JSON.stringify({ ...state.formData })
            );

            // Special handling for arrays
            if (data.dzieci && Array.isArray(data.dzieci)) {
              newFormData.dzieci = [...data.dzieci];
            }

            // Update metadata
            const newMetaData = {
              ...state.metaData,
              lastUpdated: Date.now(),
            };

            return {
              formData: { ...newFormData, ...data },
              metaData: newMetaData,
            };
          } catch (error) {
            console.error("Error during form data update:", error);
            return state; // return unchanged state on error
          }
        }),

      setMetaData: (data) =>
        set((state) => ({
          metaData: { ...state.metaData, ...data },
        })),

      resetForm: () =>
        set({
          formData: {},
          metaData: {
            lastUpdated: Date.now(),
            version: "1.1.0",
          },
        }),
      clearAllData: () => {
        set({
          formData: {},
          metaData: {
            lastUpdated: Date.now(),
            version: "1.1.0",
          },
        });

        // Check if we're in a server environment
        if (typeof window !== "undefined") {
          try {
            sessionStorage.removeItem("alimatrix-secure-form");
          } catch (error) {
            console.error("Error removing from sessionStorage:", error);
          }
        }
      },
    }),
    {
      name: "alimatrix-secure-form",
      storage: createJSONStorage(() => customStorage),
      partialize: (state) => ({
        formData: state.formData,
        metaData: state.metaData,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
        } else {
          console.error("Failed to hydrate form data");
        }
      },
    }
  )
);

// Funkcja do automatycznego czyszczenia danych po określonym czasie bezczynności
export const setupAutoDataClear = (timeoutMinutes: number = 30) => {
  // Check if we're in a server environment
  if (typeof window === "undefined") {
    return () => {}; // Return empty cleanup function
  }

  let inactivityTimer: NodeJS.Timeout;

  const resetTimer = () => {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      useSecureFormStore.getState().clearAllData();
    }, timeoutMinutes * 60 * 1000);
  };

  // Reset timer on user activity
  const activityEvents = ["mousedown", "keypress", "scroll", "touchstart"];
  activityEvents.forEach((event) => {
    window.addEventListener(event, resetTimer);
  });

  // Initial setup
  resetTimer();

  // Cleanup function
  return () => {
    clearTimeout(inactivityTimer);
    activityEvents.forEach((event) => {
      window.removeEventListener(event, resetTimer);
    });
  };
};
