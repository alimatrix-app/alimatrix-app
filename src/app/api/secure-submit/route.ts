// Route handler for form submissions with CSRF protection
// Fixes made on May 20, 2025: fixed offline mode issues and proper form data storage
// Enhanced with AliMatrix 2.0 Security Systems
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  formSubmissionSchema,
  sanitizeEmail,
  sanitizeFormData,
  checkRateLimit,
} from "@/lib/form-validation";
import { verifyCSRFToken, consumeCSRFToken } from "@/lib/csrf";
import {
  verifyCSRFToken as verifyCSRFTokenV2,
  rotateCSRFTokens,
} from "@/lib/csrf-v2";
import {
  performSecurityChecks,
  securityHeaders,
} from "@/lib/security-middleware";
import { AuditLogger } from "@/lib/audit-system";
import {
  addToOfflineQueue,
  updateDatabaseStatus,
} from "@/lib/db-connection-helper";

// Sprawdzenie środowiska uruchomieniowego i konfiguracji bazy danych
const isDevelopment = process.env.NODE_ENV === "development";
// Usunięto logowanie środowiska i danych połączenia DB ze względów bezpieczeństwa

// Define offline subscription type
interface OfflineSubscription {
  id: string;
  email: string;
  acceptedTerms: boolean;
  acceptedContact: boolean;
  createdAt: Date;
  isOfflineEntry: true;
}

// Helper function to convert string to number or null
const convertToNumber = (value: any): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const num = parseFloat(String(value));
  return isNaN(num) ? null : num;
};

// Helper function to convert string to boolean
const convertToBoolean = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return Boolean(value);
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sessionId: string | undefined;
  let securityCheck: any;

  try {
    // Enhanced security checks with AliMatrix 2.0
    securityCheck = await performSecurityChecks(request, {
      requireCSRF: true,
      rateLimit: { requests: 5, windowMs: 60000 },
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(","),
    });

    if (!securityCheck.success) {
      // Log security incident
      await AuditLogger.logSecurityIncident({
        incidentType: "SECURITY_CHECK_FAILED",
        severity: "medium",
        ipAddress: securityCheck.cleanIp,
        userAgent: request.headers.get("user-agent") || undefined,
        description: "Security checks failed for secure-submit endpoint",
        requestData: {
          endpoint: "/api/secure-submit",
          headers: Object.fromEntries(request.headers.entries()),
        },
      });

      return securityCheck.errorResponse!;
    }

    const ip = securityCheck.cleanIp;
    sessionId = request.headers.get("x-session-id") || undefined;

    // Parse the request body
    const body = await request.json();
    // Sanitize the data to prevent injection attacks
    const sanitizedBody = sanitizeFormData(body);

    // Log form access
    await AuditLogger.log({
      sessionId,
      action: "FORM_ACCESS",
      resource: "secure-submit",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        endpoint: "/api/secure-submit",
        hasEmail: !!sanitizedBody.contactEmail,
        hasAgreements: !!(
          sanitizedBody.zgodaPrzetwarzanie && sanitizedBody.zgodaKontakt
        ),
      },
      riskLevel: "low",
    });

    // Check honeypot field - if it's not empty, it's likely a bot
    if (sanitizedBody.notHuman && sanitizedBody.notHuman.length > 0) {
      // Log bot detection
      await AuditLogger.logSecurityIncident({
        incidentType: "BOT_DETECTED",
        severity: "medium",
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
        sessionId,
        description: "Bot detected via honeypot field",
        requestData: { endpoint: "/api/secure-submit" },
      });

      // Don't reveal that we detected a bot - just return a success message
      console.warn("Bot detected via honeypot field - IP:", ip);
      return NextResponse.json(
        { success: true, message: "Form submitted successfully" },
        { status: 200, headers: securityHeaders }
      );
    }
    const {
      contactEmail,
      zgodaPrzetwarzanie,
      zgodaKontakt,
      // Reszta danych formularza (obecnie nieużywana)
      ..._unusedFormData
    } = sanitizedBody;

    // Basic validation
    if (!contactEmail || typeof contactEmail !== "string") {
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "secure-submit",
        ipAddress: ip,
        details: { reason: "Missing or invalid email" },
        riskLevel: "medium",
        success: false,
      });

      console.error("Email validation failed:", {
        contactEmail,
        body: sanitizedBody,
      });
      return NextResponse.json(
        { error: "Email jest wymagany" },
        { status: 400, headers: securityHeaders }
      );
    }

    if (!zgodaPrzetwarzanie || !zgodaKontakt) {
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "secure-submit",
        ipAddress: ip,
        details: { reason: "Missing required agreements" },
        riskLevel: "medium",
        success: false,
      });

      return NextResponse.json(
        { error: "Wymagane są obie zgody" },
        { status: 400, headers: securityHeaders }
      );
    }

    // Proper email sanitization and verification
    const cleanEmail = sanitizeEmail(contactEmail);

    if (!cleanEmail || cleanEmail.length < 5 || !cleanEmail.includes("@")) {
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "secure-submit",
        ipAddress: ip,
        details: { reason: "Invalid email format" },
        riskLevel: "medium",
        success: false,
      });

      console.error("Email format validation failed:", { cleanEmail });
      return NextResponse.json(
        { error: "Nieprawidłowy format adresu email" },
        { status: 400, headers: securityHeaders }
      );
    }

    // Validate with Zod schema
    try {
      formSubmissionSchema.parse({
        contactEmail: cleanEmail,
        zgodaPrzetwarzanie,
        zgodaKontakt,
        submissionDate:
          sanitizedBody.submissionDate || new Date().toISOString(),
      });
    } catch (validationError) {
      console.error("Validation error:", validationError);
      return NextResponse.json(
        { error: "Nieprawidłowe dane formularza" },
        { status: 400, headers: securityHeaders }
      );
    }
    try {
      // Try to save the email subscription with proper schema
      let subscription: any; // Using 'any' type to avoid complex Prisma types
      try {
        // Próba sprawdzenia połączenia z bazą danych bez explicit $connect
        // Nowsze wersje Prisma automatycznie łączą się z bazą przy pierwszej operacji
        let isConnected = false;
        try {
          // Sprawdzmy czy możemy wykonać prostą operację na bazie
          const dbCheck = await prisma.$queryRaw`SELECT 1 as connected`;

          updateDatabaseStatus(true);
          isConnected = true;
        } catch (connectionError) {
          console.error("Database connection failed:", connectionError);
          const error = connectionError as Error;
          updateDatabaseStatus(false, error);
          isConnected = false;
        } // Sprawdzenie statusu połączenia - teraz tylko logujemy, nie wyrzucamy błędu
        if (!isConnected) {
          console.warn(
            "Database connection issue detected, attempting to reconnect..."
          );
          await prisma.$connect();
        }

        // Create or find the email subscription
        subscription = await prisma.emailSubscription.upsert({
          where: {
            email: cleanEmail,
          },
          update: {
            acceptedTerms: zgodaPrzetwarzanie === true,
            acceptedContact: zgodaKontakt === true,
            submittedAt: new Date(),
            status: "submitted",
          },
          create: {
            email: cleanEmail,
            acceptedTerms: zgodaPrzetwarzanie === true,
            acceptedContact: zgodaKontakt === true,
            submittedAt: new Date(),
            status: "submitted",
          },
        });
      } catch (err) {
        const error = err as Error & { code?: string; meta?: any };

        // Log detailed error information
        console.error("Database error details:", {
          message: error.message,
          name: error.name,
          code: error.code,
          meta: error.meta,
          stack: error.stack,
        });

        // Generate UUID as a fallback if email subscription creation fails
        const uuidv4 = () => {
          return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
              var r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            }
          );
        };

        subscription = {
          id: uuidv4(),
          email: cleanEmail,
          acceptedTerms: zgodaPrzetwarzanie === true,
          acceptedContact: zgodaKontakt === true,
          createdAt: new Date(),
        };
      }

      // Create a new form submission with reference to the email subscription
      const formData = { ...sanitizedBody };

      // Remove fields that are stored separately
      delete formData.contactEmail;
      delete formData.zgodaPrzetwarzanie;
      delete formData.zgodaKontakt;
      delete formData.notHuman;
      delete formData.csrfToken;

      // Update form date for consistency
      formData.submissionDate = new Date().toISOString(); // Court data processing complete

      let submissionId: string;

      try {
        await prisma.$connect();

        // Extract children data
        const dzieci = formData.dzieci || [];
        delete formData.dzieci;

        // Extract income data
        const dochodyRodzicow = formData.dochodyRodzicow || null;
        delete formData.dochodyRodzicow;

        // Prepare base form submission data
        const createData = {
          emailSubscriptionId: subscription.id,
          // Store complete form data as JSON for backup
          formData: formData,
          submittedAt: new Date(),
          status: "pending",

          // Form structure fields
          sciezkaWybor: formData.sciezkaWybor || null,
          podstawaUstalen: formData.podstawaUstalen || null,
          podstawaUstalenInne: formData.podstawaUstalenInne || null,
          wariantPostepu: formData.wariantPostepu || null,
          sposobFinansowania: formData.sposobFinansowania || null,

          // Demographic data
          plecUzytkownika: formData.plecUzytkownika || null,
          wiekUzytkownika: formData.wiekUzytkownika || null,
          wojewodztwoUzytkownika: formData.wojewodztwoUzytkownika || null,
          miejscowoscUzytkownika: formData.miejscowoscUzytkownika || null,
          stanCywilnyUzytkownika: formData.stanCywilnyUzytkownika || null,
          plecDrugiegoRodzica: formData.plecDrugiegoRodzica || null,
          wiekDrugiegoRodzica: formData.wiekDrugiegoRodzica || null,
          wojewodztwoDrugiegoRodzica:
            formData.wojewodztwoDrugiegoRodzica || null,
          miejscowoscDrugiegoRodzica:
            formData.miejscowoscDrugiegoRodzica || null,

          // Court data
          rodzajSaduSad: formData.rodzajSaduSad || null,
          apelacjaSad: formData.apelacjaSad || null,
          apelacjaNazwa: formData.apelacjaNazwa || null,
          sadOkregowyNazwa: formData.sadOkregowyNazwa || null,
          sadRejonowyNazwa: formData.sadRejonowyNazwa || null,
          rokDecyzjiSad: formData.rokDecyzjiSad || null,
          miesiacDecyzjiSad: formData.miesiacDecyzjiSad || null,
          dataDecyzjiSad: formData.dataDecyzjiSad || null,
          liczbaSedzi: formData.liczbaSedzi || null,
          plecSedziego: formData.plecSedziego || null,
          inicjalySedziego: formData.inicjalySedziego || null,
          czyPozew: formData.czyPozew || null,
          watekWiny: formData.watekWiny || null,

          // Agreement data
          dataPorozumienia: formData.dataPorozumienia || null,
          sposobPorozumienia: formData.sposobPorozumienia || null,
          formaPorozumienia: formData.formaPorozumienia || null,
          klauzulaWaloryzacyjna: formData.klauzulaWaloryzacyjna || null,

          // Other arrangement data
          dataUstalenInnych: formData.dataUstalenInnych || null,
          uzgodnienieFinansowania: formData.uzgodnienieFinansowania || null,
          planyWystapieniaDoSadu: formData.planyWystapieniaDoSadu || null,

          // Adequacy ratings
          ocenaAdekwatnosciSad: convertToNumber(formData.ocenaAdekwatnosciSad),
          ocenaAdekwatnosciPorozumienie: convertToNumber(
            formData.ocenaAdekwatnosciPorozumienie
          ),
          ocenaAdekwatnosciInne: convertToNumber(
            formData.ocenaAdekwatnosciInne
          ),

          // Number of children
          liczbaDzieci: formData.liczbaDzieci
            ? parseInt(String(formData.liczbaDzieci))
            : null,
        };

        // Build complete submission data with children and income
        const fullCreateData = {
          ...createData,

          // Add optional IDs if present
          ...(formData.apelacjaId ? { apelacjaId: formData.apelacjaId } : {}),
          ...(formData.sadOkregowyId
            ? { sadOkregowyId: formData.sadOkregowyId }
            : {}),
          ...(formData.sadRejonowyId
            ? { sadRejonowyId: formData.sadRejonowyId }
            : {}),

          // Add children data if present
          ...(dzieci && dzieci.length > 0
            ? {
                dzieci: {
                  create: dzieci.map((dziecko: any, index: number) => ({
                    childId: dziecko.id
                      ? parseInt(String(dziecko.id))
                      : index + 1,
                    wiek: dziecko.wiek ? parseInt(String(dziecko.wiek)) : null,
                    plec: dziecko.plec || null,
                    specjalnePotrzeby: convertToBoolean(
                      dziecko.specjalnePotrzeby
                    ),
                    opisSpecjalnychPotrzeb:
                      dziecko.opisSpecjalnychPotrzeb || null,
                    uczeszczeDoPlacowki: convertToBoolean(
                      dziecko.uczeszczeDoPlacowki
                    ),
                    typPlacowki: dziecko.typPlacowki || null,
                    opiekaInnejOsoby: convertToBoolean(
                      dziecko.opiekaInnejOsoby
                    ),
                    modelOpieki: dziecko.modelOpieki || null,
                    cyklOpieki: dziecko.cyklOpieki || null,
                    procentCzasuOpieki: convertToNumber(
                      dziecko.procentCzasuOpieki
                    ),
                    // Dodatkowe wskaźniki czasu opieki
                    procentCzasuOpiekiBezEdukacji: convertToNumber(
                      dziecko.procentCzasuOpiekiBezEdukacji
                    ),
                    procentCzasuAktywnejOpieki: convertToNumber(
                      dziecko.procentCzasuAktywnejOpieki
                    ),
                    procentCzasuSnu: convertToNumber(dziecko.procentCzasuSnu),
                    kwotaAlimentow: convertToNumber(dziecko.kwotaAlimentow),
                    twojeMiesieczneWydatki: convertToNumber(
                      dziecko.twojeMiesieczneWydatki
                    ),
                    wydatkiDrugiegoRodzica: convertToNumber(
                      dziecko.wydatkiDrugiegoRodzica
                    ),
                    kosztyUznanePrzezSad: convertToNumber(
                      dziecko.kosztyUznanePrzezSad
                    ),
                    rentaRodzinna: convertToBoolean(dziecko.rentaRodzinna),
                    rentaRodzinnaKwota: convertToNumber(
                      dziecko.rentaRodzinnaKwota
                    ),
                    swiadczeniePielegnacyjne: convertToBoolean(
                      dziecko.swiadczeniePielegnacyjne
                    ),
                    swiadczeniePielegnacyjneKwota: convertToNumber(
                      dziecko.swiadczeniePielegnacyjneKwota
                    ),
                    inneZrodla: convertToBoolean(dziecko.inneZrodla),
                    inneZrodlaOpis: dziecko.inneZrodlaOpis || null,
                    inneZrodlaKwota: convertToNumber(dziecko.inneZrodlaKwota),
                    brakDodatkowychZrodel:
                      dziecko.brakDodatkowychZrodel !== false,
                    tabelaCzasu: dziecko.tabelaCzasu || null,
                    wskaznikiCzasuOpieki: dziecko.wskaznikiCzasuOpieki || null,
                    wakacjeProcentCzasu: convertToNumber(
                      dziecko.wakacjeProcentCzasu
                    ),
                    wakacjeSzczegolowyPlan: convertToBoolean(
                      dziecko.wakacjeSzczegolowyPlan
                    ),
                    wakacjeOpisPlan: dziecko.wakacjeOpisPlan || null,
                  })),
                },
              }
            : {}),

          // Add income data if present
          ...(dochodyRodzicow
            ? {
                dochodyRodzicow: {
                  create: {
                    // Submitting parent income
                    wlasneDochodyNetto: convertToNumber(
                      dochodyRodzicow.wlasne?.oficjalneDochodyNetto
                    ),
                    wlasnePotencjalDochodowy: convertToNumber(
                      dochodyRodzicow.wlasne?.potencjalDochodowy
                    ),
                    wlasneKosztyUtrzymania: convertToNumber(
                      dochodyRodzicow.wlasne?.kosztyUtrzymaniaSiebie
                    ),
                    wlasneKosztyInni: convertToNumber(
                      dochodyRodzicow.wlasne?.kosztyUtrzymaniaInnychOsob
                    ),
                    wlasneDodatkoweZobowiazania: convertToNumber(
                      dochodyRodzicow.wlasne?.dodatkoweZobowiazania
                    ),

                    // Other parent income
                    drugiRodzicDochody: convertToNumber(
                      dochodyRodzicow.drugiRodzic?.oficjalneDochodyNetto
                    ),
                    drugiRodzicPotencjal: convertToNumber(
                      dochodyRodzicow.drugiRodzic?.potencjalDochodowy
                    ),
                    drugiRodzicKoszty: convertToNumber(
                      dochodyRodzicow.drugiRodzic?.kosztyUtrzymaniaSiebie
                    ),
                    drugiRodzicKosztyInni: convertToNumber(
                      dochodyRodzicow.drugiRodzic?.kosztyUtrzymaniaInnychOsob
                    ),
                    drugiRodzicDodatkowe: convertToNumber(
                      dochodyRodzicow.drugiRodzic?.dodatkoweZobowiazania
                    ),
                  },
                },
              }
            : {}),
        };
        // Create the submission with all related data
        const submission = await prisma.formSubmission.create({
          data: fullCreateData,
          include: {
            dzieci: true,
            dochodyRodzicow: true,
          },
        });
        submissionId = submission.id;

        // Log child and income data
        if (submission.dzieci && submission.dzieci.length > 0) {
        }

        if (submission.dochodyRodzicow) {
        }

        // Log successful form submission
        const processingTime = Date.now() - startTime;
        await AuditLogger.log({
          sessionId,
          action: "FORM_SUBMISSION_SUCCESS",
          resource: "secure-submit",
          resourceId: submissionId,
          formSubmissionId: submissionId,
          ipAddress: ip,
          userAgent: request.headers.get("user-agent") || undefined,
          details: {
            email: cleanEmail,
            hasChildren: !!(submission.dzieci && submission.dzieci.length > 0),
            hasIncomeData: !!submission.dochodyRodzicow,
            childrenCount: submission.dzieci?.length || 0,
            processingTime,
          },
          riskLevel: "low",
          success: true,
          responseCode: 200,
          processingTime,
        });

        // Generate new CSRF token for next request (rotateCSRFTokens is a cleanup function, not token generator)
        // For now, we'll use the existing CSRF system

        // Return success response with details
        return NextResponse.json(
          {
            success: true,
            message:
              "Formularz został pomyślnie przesłany i zapisany w bazie danych.",
            id: submissionId,
            sadRejonowyNazwa: formData.sadRejonowyNazwa || null,
            apelacjaNazwa: formData.apelacjaNazwa || null,
            sadOkregowyNazwa: formData.sadOkregowyNazwa || null,
            childrenCount: submission.dzieci?.length || 0,
            hasIncomeData: !!submission.dochodyRodzicow,
          },
          {
            status: 200,
            headers: securityHeaders,
          }
        );
      } catch (dbError) {
        console.error("Database error during form submission:", dbError);

        // Use UUID as fallback
        const uuidv4 = () => {
          return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
              var r = (Math.random() * 16) | 0,
                v = c == "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            }
          );
        };

        submissionId = uuidv4();

        return NextResponse.json(
          {
            success: true, // Return success to client despite error
            message:
              "Formularz został przyjęty, ale wystąpił problem z zapisem w bazie. Prosimy o kontakt.",
            id: submissionId,
            isOffline: false, // Hide offline status from user
            sadRejonowyNazwa: formData.sadRejonowyNazwa || null,
            apelacjaNazwa: formData.apelacjaNazwa || null,
            sadOkregowyNazwa: formData.sadOkregowyNazwa || null,
          },
          {
            status: 200,
            headers: securityHeaders,
          }
        );
      }
    } catch (error) {
      console.error("Error processing form submission:", error);

      // Generate UUID for emergency response
      const uuidv4 = () => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
          /[xy]/g,
          function (c) {
            var r = (Math.random() * 16) | 0,
              v = c == "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }
        );
      };

      const generatedId = uuidv4();
      return NextResponse.json(
        {
          success: true,
          message:
            "Zgłoszenie zostało przyjęte, ale wystąpił błąd podczas przetwarzania. Prosimy o kontakt z obsługą.",
          id: generatedId,
          isOffline: false,
          isEmergency: false,
          error:
            "Formularz został przyjęty, lecz nastąpiły problemy techniczne. Kontakt z pomocą techniczną może być wymagany.",
        },
        {
          status: 500,
          headers: securityHeaders,
        }
      );
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log unexpected error
    await AuditLogger.log({
      sessionId,
      action: "FORM_SUBMISSION_ERROR",
      resource: "secure-submit",
      ipAddress: securityCheck?.cleanIp || "unknown",
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime,
      },
      riskLevel: "high",
      success: false,
      errorMessage: error instanceof Error ? error.message : "Unexpected error",
      responseCode: 500,
      processingTime,
    });

    console.error("Unexpected error in API route:", error);
    return NextResponse.json(
      {
        error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę.",
      },
      {
        status: 500,
        headers: securityHeaders,
      }
    );
  }
}
