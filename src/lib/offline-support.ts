// Implementacja obsługi trybu offline dla formularza
import { useState, useEffect } from "react";

// Stan połączenia sieciowego
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, []);

  return isOnline;
};

// Zapisywanie danych formularza lokalnie
const saveFormDataLocally = (formData: any) => {
  // Check if we're in a server environment
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(
      "alimatrix_form_backup",
      JSON.stringify({
        data: formData,
        timestamp: new Date().toISOString(),
      })
    );
    return true;
  } catch (error) {
    console.error("Błąd podczas lokalnego zapisywania danych:", error);
    return false;
  }
};

// Odczytywanie danych formularza z lokalnego magazynu
const getLocalFormData = () => {
  // Check if we're in a server environment
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const data = localStorage.getItem("alimatrix_form_backup");
    if (data) {
      const parsedData = JSON.parse(data);
      return parsedData;
    }
  } catch (error) {
    console.error("Błąd podczas odczytywania lokalnych danych:", error);
  }
  return null;
};

// Funkcja symulująca wysyłkę formularza w trybie offline
const handleOfflineSubmission = async (formData: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const success = saveFormDataLocally(formData);
      if (success) {
        resolve({
          success: true,
          message:
            "Dane zapisane lokalnie. Zostaną wysłane automatycznie, gdy połączenie internetowe zostanie przywrócone.",
          id: `offline-${new Date().getTime()}`,
          isOffline: true,
        });
      } else {
        throw new Error(
          "Nie udało się zapisać danych lokalnie. Sprawdź ustawienia przeglądarki."
        );
      }
    }, 1000);
  });
};

export {
  useNetworkStatus,
  saveFormDataLocally,
  getLocalFormData,
  handleOfflineSubmission,
};
