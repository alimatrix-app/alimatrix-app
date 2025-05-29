// AliMatrix 2.0 - Enhanced subscribe route with comprehensive security
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  formSubmissionSchema,
  sanitizeEmail,
  sanitizeFormData,
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
      requireCSRF: false, // Allow basic subscriptions without CSRF for simpler forms
      rateLimit: { requests: 10, windowMs: 60000 }, // More lenient for subscriptions
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
        description: "Security checks failed for subscribe-v2 endpoint",
        requestData: {
          endpoint: "/api/subscribe-v2",
          headers: Object.fromEntries(request.headers.entries()),
        },
      });

      return securityCheck.errorResponse!;
    }

    const ip = securityCheck.cleanIp;
    sessionId = request.headers.get("x-session-id") || undefined;

    // Parse and validate request body
    const body = await request.json();

    // Log subscription access
    await AuditLogger.log({
      sessionId,
      action: "SUBSCRIPTION_ACCESS",
      resource: "subscribe-v2",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        endpoint: "/api/subscribe-v2",
        hasEmail: !!(body.email || body.contactEmail),
        hasAgreements: !!(
          body.acceptedTerms ||
          (body.zgodaPrzetwarzanie && body.zgodaKontakt)
        ),
      },
      riskLevel: "low",
    });

    // Handle legacy field mapping for backward compatibility
    if (body.email && !body.contactEmail) {
      body.contactEmail = body.email;
      delete body.email;
    }

    if (
      body.acceptedTerms !== undefined &&
      body.zgodaPrzetwarzanie === undefined
    ) {
      body.zgodaPrzetwarzanie = body.acceptedTerms;
      body.zgodaKontakt = body.acceptedTerms; // Simplified consent
      delete body.acceptedTerms;
    }

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
        description: "Bot detected via honeypot field in subscribe-v2",
        requestData: { endpoint: "/api/subscribe-v2" },
      });

      console.warn(`Bot detected via honeypot for IP ${ip}`);
      // Return success to not reveal bot detection
      return NextResponse.json(
        {
          success: true,
          message: "Formularz zapisany pomyślnie",
          submissionId: "bot-detected",
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
        resource: "subscribe-v2",
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
        resource: "subscribe-v2",
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
        resource: "subscribe-v2",
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
        resource: "subscribe-v2",
        ipAddress: ip,
        details: { reason: "Schema validation failed" },
        riskLevel: "medium",
        success: false,
        errorMessage:
          validationError instanceof Error
            ? validationError.message
            : "Schema validation failed",
      });

      console.error("Zod validation error in subscribe:", validationError);
      return NextResponse.json(
        { error: "Nieprawidłowe dane formularza" },
        { status: 400, headers: securityHeaders }
      );
    }

    // Database operations with enhanced error handling
    try {
      // Create contact submission with enhanced security
      const contactSubmission = await prisma.emailSubscription.create({
        data: {
          email: cleanEmail,
          acceptedTerms: zgodaPrzetwarzanie === true,
          acceptedContact: zgodaKontakt === true,
        },
        select: {
          id: true,
        },
      });

      let formSubmissionId = null;

      // Create form submission with enhanced sanitization if form data exists
      if (Object.keys(formData).length > 0) {
        const formDataObj = { ...formData };
        const formSubmission = await prisma.formSubmission.create({
          data: {
            emailSubscriptionId: contactSubmission.id,
            formData: formDataObj,
            status: "pending",
            // Note: submittedFrom and userAgent tracking will be handled via audit logs
          },
          select: {
            id: true,
          },
        });

        formSubmissionId = formSubmission.id;
      }

      // Log successful subscription
      const processingTime = Date.now() - startTime;
      await AuditLogger.log({
        sessionId,
        action: "SUBSCRIPTION_SUCCESS",
        resource: "subscribe-v2",
        resourceId: formSubmissionId || contactSubmission.id,
        formSubmissionId: formSubmissionId || undefined,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
        details: {
          email: cleanEmail,
          hasFormData: Object.keys(formData).length > 0,
          subscriptionType: formSubmissionId ? "with_form" : "newsletter_only",
          processingTime,
        },
        riskLevel: "low",
        success: true,
        responseCode: 201,
        processingTime,
      });

      if (formSubmissionId) {
        return NextResponse.json(
          {
            success: true,
            message: "Formularz zapisany pomyślnie",
            submissionId: formSubmissionId,
          },
          {
            status: 201,
            headers: securityHeaders,
          }
        );
      } else {
        // Simple subscription without form data
        return NextResponse.json(
          {
            success: true,
            message: "Zapisano do newslettera pomyślnie",
            submissionId: contactSubmission.id,
          },
          {
            status: 201,
            headers: securityHeaders,
          }
        );
      }
    } catch (dbError) {
      const processingTime = Date.now() - startTime;

      // Log database error
      await AuditLogger.log({
        sessionId,
        action: "SUBSCRIPTION_ERROR",
        resource: "subscribe-v2",
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

      console.error("Database error in subscribe:", dbError);

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
      action: "SUBSCRIPTION_ERROR",
      resource: "subscribe-v2",
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

    console.error("Unexpected error in subscribe:", error);
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę." },
      { status: 500, headers: securityHeaders }
    );
  }
}
