// AliMatrix 2.0 - Enhanced submit-form route with comprehensive security
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  formSubmissionSchema,
  sanitizeEmail,
  sanitizeFormData,
  checkRateLimit,
} from "@/lib/form-validation";
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
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
        "localhost",
        "almatrix.com",
        "almatrix.vercel.app",
      ],
    });

    if (!securityCheck.success) {
      // Log security incident
      await AuditLogger.logSecurityIncident({
        incidentType: "SECURITY_CHECK_FAILED",
        severity: "medium",
        ipAddress: securityCheck.cleanIp,
        userAgent: request.headers.get("user-agent") || undefined,
        description: "Security checks failed for submit-form-v2 endpoint",
        requestData: {
          endpoint: "/api/submit-form-v2",
          headers: Object.fromEntries(request.headers.entries()),
        },
      });

      return securityCheck.errorResponse!;
    }

    const ip = securityCheck.cleanIp;
    sessionId = request.headers.get("x-session-id") || undefined;

    // Parse and validate request body
    const body = await request.json();

    // Log form access
    await AuditLogger.log({
      sessionId,
      action: "FORM_ACCESS",
      resource: "submit-form-v2",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        endpoint: "/api/submit-form-v2",
        hasEmail: !!body.contactEmail,
        hasAgreements: !!(body.zgodaPrzetwarzanie && body.zgodaKontakt),
      },
      riskLevel: "low",
    });

    const sanitizedBody = sanitizeFormData(body);

    // Honeypot validation
    if (sanitizedBody.notHuman && sanitizedBody.notHuman.length > 0) {
      // Log bot detection
      await AuditLogger.logSecurityIncident({
        incidentType: "BOT_DETECTED",
        severity: "medium",
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
        sessionId,
        description: "Bot detected via honeypot field in submit-form-v2",
        requestData: { endpoint: "/api/submit-form-v2" },
      });

      console.warn(`Bot detected via honeypot for IP ${ip}`);
      // Return success to not reveal bot detection
      return NextResponse.json(
        {
          success: true,
          message: "Formularz zapisany pomyślnie",
          id: "bot-detected",
        },
        {
          status: 200,
          headers: securityHeaders,
        }
      );
    }

    const { contactEmail, zgodaPrzetwarzanie, zgodaKontakt, ...formData } =
      sanitizedBody;

    // Enhanced email validation
    if (!contactEmail || typeof contactEmail !== "string") {
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "submit-form-v2",
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
        resource: "submit-form-v2",
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

    const cleanEmail = sanitizeEmail(contactEmail);

    if (!cleanEmail || cleanEmail.length < 5 || !cleanEmail.includes("@")) {
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "submit-form-v2",
        ipAddress: ip,
        details: { reason: "Invalid email format" },
        riskLevel: "medium",
        success: false,
      });

      return NextResponse.json(
        { error: "Nieprawidłowy format adresu email" },
        { status: 400, headers: securityHeaders }
      );
    }

    // Enhanced Zod validation
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
        resource: "submit-form-v2",
        ipAddress: ip,
        details: { reason: "Schema validation failed" },
        riskLevel: "medium",
        success: false,
        errorMessage:
          validationError instanceof Error
            ? validationError.message
            : "Schema validation failed",
      });

      console.error("Zod validation error:", validationError);
      return NextResponse.json(
        { error: "Nieprawidłowe dane formularza" },
        { status: 400, headers: securityHeaders }
      );
    }

    // Database operations with enhanced error handling
    try {
      // Create email subscription with enhanced data sanitization
      const subscription = await prisma.emailSubscription.create({
        data: {
          email: cleanEmail,
          acceptedTerms: zgodaPrzetwarzanie === true,
          acceptedContact: zgodaKontakt === true,
        },
      });

      // Prepare form data with enhanced sanitization
      const formDataObj = { ...formData };

      // Extract court-related fields for better indexing
      const rodzajSaduSad = formDataObj.rodzajSaduSad || null;
      const apelacjaSad = formDataObj.apelacjaSad || null;
      const sadOkregowyId = formDataObj.sadOkregowyId || null;
      const rokDecyzjiSad = formDataObj.rokDecyzjiSad || null;
      const watekWiny = formDataObj.watekWiny || null; // Create form submission with secure Prisma ORM
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
          // Note: submittedFrom and userAgent tracking will be handled via audit logs
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
        resource: "submit-form-v2",
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

      // Success response with minimal data exposure
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
    } catch (dbError) {
      const processingTime = Date.now() - startTime;

      // Log database error
      await AuditLogger.log({
        sessionId,
        action: "FORM_SUBMISSION_ERROR",
        resource: "submit-form-v2",
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
        details: {
          error: dbError instanceof Error ? dbError.message : "Database error",
          processingTime,
        },
        riskLevel: "high",
        success: false,
        errorMessage:
          dbError instanceof Error ? dbError.message : "Database error",
        responseCode:
          dbError instanceof Error &&
          dbError.message.includes("Unique constraint failed")
            ? 409
            : 500,
        processingTime,
      });

      console.error("Database error in submit-form:", dbError);

      // Check for specific database errors
      if (
        dbError instanceof Error &&
        dbError.message.includes("Unique constraint failed")
      ) {
        return NextResponse.json(
          { error: "Ten adres email jest już zarejestrowany." },
          { status: 409, headers: securityHeaders }
        );
      }

      return NextResponse.json(
        {
          error:
            "Wystąpił błąd podczas przetwarzania formularza. Spróbuj ponownie.",
        },
        { status: 500, headers: securityHeaders }
      );
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log unexpected error
    await AuditLogger.log({
      sessionId,
      action: "FORM_SUBMISSION_ERROR",
      resource: "submit-form-v2",
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

    console.error("Unexpected error in submit-form:", error);
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę." },
      { status: 500, headers: securityHeaders }
    );
  }
}
