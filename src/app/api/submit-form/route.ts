// Route handler for form submissions
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  formSubmissionSchema,
  sanitizeEmail,
  sanitizeFormData,
  checkRateLimit,
} from "@/lib/form-validation";
// Import CSRF functions (to be used in future updates)
// import { verifyCSRFToken, consumeCSRFToken } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || "anonymous";

    // Apply rate limiting
    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json(
        { error: "Zbyt wiele żądań. Spróbuj ponownie za kilka minut." },
        { status: 429 }
      );
    }

    // Check for CSRF token in headers
    const csrfToken = request.headers.get("X-CSRF-Token");
    if (!csrfToken) {
      return NextResponse.json(
        {
          error:
            "Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.",
        },
        { status: 403 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    // Usunięto logowanie danych użytkownika ze względów bezpieczeństwa

    // Sanitize the data
    const sanitizedBody = sanitizeFormData(body);
    // Usunięto logowanie danych użytkownika ze względów bezpieczeństwa
    
    const { contactEmail, zgodaPrzetwarzanie, zgodaKontakt, ...formData } = sanitizedBody;
      
    // Usunięto logowanie emaila ze względów bezpieczeństwa
    if (!contactEmail || typeof contactEmail !== "string") {
      // Usunięto logowanie danych osobowych ze względów bezpieczeństwa
      return NextResponse.json(
        { error: "Email jest wymagany" },
        { status: 400 }
      );
    }

    if (!zgodaPrzetwarzanie || !zgodaKontakt) {
      return NextResponse.json(
        { error: "Wymagane są obie zgody" },
        { status: 400 }
      );
    }

    // Proper email sanitization
    const cleanEmail = sanitizeEmail(contactEmail);

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
        { status: 400 }
      );
    } 
    
    // Save the email subscription first
    const subscription = await prisma.emailSubscription.create({
      data: {
        email: cleanEmail,
        acceptedTerms: zgodaPrzetwarzanie === true,
      },
    });

    // Przygotuj dane formularza
    const formDataObj = { ...formData };

    // Wyodrębnij pola dotyczące sądu do osobnych kolumn dla lepszego indeksowania
    const rodzajSaduSad = formDataObj.rodzajSaduSad || null;
    const apelacjaSad = formDataObj.apelacjaSad || null;
    const sadOkregowyId = formDataObj.sadOkregowyId || null;
    const rokDecyzjiSad = formDataObj.rokDecyzjiSad || null;
    const watekWiny = formDataObj.watekWiny || null;

    // Zapisz formularz z nowymi polami
    const submission = (await prisma.$queryRaw`
      INSERT INTO "FormSubmission" (
        "id", 
        "emailSubscriptionId", 
        "formData", 
        "status",
        "rodzajSaduSad",
        "apelacjaSad",
        "sadOkregowyId",
        "rokDecyzjiSad",
        "watekWiny"
      )
      VALUES (
        gen_random_uuid(), 
        ${subscription.id}, 
        ${JSON.stringify(formDataObj)}::jsonb, 
        'pending',
        ${rodzajSaduSad},
        ${apelacjaSad},
        ${sadOkregowyId},
        ${rokDecyzjiSad},
        ${watekWiny}
      )
      RETURNING "id"
    `) as { id: string }[]; 
    
    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Formularz zapisany pomyślnie",
        id: submission[0]?.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing form submission:", error);

    // Check for duplicate email error
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      return NextResponse.json(
        { error: "Ten adres email jest już zarejestrowany." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Wystąpił błąd podczas przetwarzania formularza. Spróbuj ponownie.",
      },
      { status: 500 }
    );
  }
}
