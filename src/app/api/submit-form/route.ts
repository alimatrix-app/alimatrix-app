// Route handler for form submissions - Enhanced with AliMatrix 2.0 Security Systems
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
  performSecurityChecks,
  securityHeaders,
} from "@/lib/security-middleware";
import { AuditLogger } from "@/lib/audit-system";

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
        description: "Security checks failed for submit-form endpoint",
        requestData: {
          endpoint: "/api/submit-form",
          headers: Object.fromEntries(request.headers.entries()),
        },
      });

      return securityCheck.errorResponse!;
    }

    const ip = securityCheck.cleanIp;
    sessionId = request.headers.get("x-session-id") || undefined;

    // Parse the request body
    const body = await request.json();

    // Log form access
    await AuditLogger.log({
      sessionId,
      action: "FORM_ACCESS",
      resource: "submit-form",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        endpoint: "/api/submit-form",
        hasEmail: !!body.contactEmail,
        hasAgreements: !!(body.zgodaPrzetwarzanie && body.zgodaKontakt),
      },
      riskLevel: "low",
    });

    // Sanitize the data
    const sanitizedBody = sanitizeFormData(body);

    const { contactEmail, zgodaPrzetwarzanie, zgodaKontakt, ...formData } =
      sanitizedBody;

    if (!contactEmail || typeof contactEmail !== "string") {
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "submit-form",
        ipAddress: ip,
        details: { reason: "Missing or invalid email" },
        riskLevel: "medium",
        success: false,
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
        resource: "submit-form",
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
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "submit-form",
        ipAddress: ip,
        details: { reason: "Schema validation failed" },
        riskLevel: "medium",
        success: false,
        errorMessage:
          validationError instanceof Error
            ? validationError.message
            : "Schema validation failed",
      });

      console.error("Validation error:", validationError);
      return NextResponse.json(
        { error: "Nieprawidłowe dane formularza" },
        { status: 400, headers: securityHeaders }
      );
    }
    // Save the email subscription first
    const subscription = await prisma.emailSubscription.create({
      data: {
        email: cleanEmail,
        acceptedTerms: zgodaPrzetwarzanie === true,
        acceptedContact: zgodaKontakt === true,
      },
    });

    // Prepare form data
    const formDataObj = { ...formData };

    // Extract court-related fields for better indexing
    const rodzajSaduSad = formDataObj.rodzajSaduSad || null;
    const apelacjaSad = formDataObj.apelacjaSad || null;
    const sadOkregowyId = formDataObj.sadOkregowyId || null;
    const rokDecyzjiSad = formDataObj.rokDecyzjiSad || null;
    const watekWiny = formDataObj.watekWiny || null;

    // SECURITY FIX: Replace raw SQL with secure Prisma ORM call
    const submission = await prisma.formSubmission.create({
      data: {
        emailSubscriptionId: subscription.id,
        formData: formDataObj,
        status: "pending",
        rodzajSaduSad,
        apelacjaSad,
        sadOkregowyId,
        rokDecyzjiSad,
        watekWiny,
      },
      select: {
        id: true,
      },
    });

    // Log successful form submission
    const processingTime = Date.now() - startTime;
    await AuditLogger.log({
      sessionId,
      action: "FORM_SUBMISSION_SUCCESS",
      resource: "submit-form",
      resourceId: submission.id,
      formSubmissionId: submission.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        email: cleanEmail,
        hasCourtData: !!(rodzajSaduSad || apelacjaSad),
        processingTime,
      },
      riskLevel: "low",
      success: true,
      responseCode: 201,
      processingTime,
    });

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Formularz zapisany pomyślnie",
        id: submission.id,
      },
      {
        status: 201,
        headers: securityHeaders,
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log error
    await AuditLogger.log({
      sessionId,
      action: "FORM_SUBMISSION_ERROR",
      resource: "submit-form",
      ipAddress: securityCheck?.cleanIp || "unknown",
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime,
      },
      riskLevel: "high",
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "Form submission error",
      responseCode:
        error instanceof Error &&
        error.message.includes("Unique constraint failed")
          ? 409
          : 500,
      processingTime,
    });

    console.error("Error processing form submission:", error);

    // Check for duplicate email error
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      return NextResponse.json(
        { error: "Ten adres email jest już zarejestrowany." },
        {
          status: 409,
          headers: securityHeaders,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Wystąpił błąd podczas przetwarzania formularza. Spróbuj ponownie.",
      },
      {
        status: 500,
        headers: securityHeaders,
      }
    );
  }
}
