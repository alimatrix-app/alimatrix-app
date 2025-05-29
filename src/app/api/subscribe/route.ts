// Route handler for subscription forms - Enhanced with AliMatrix 2.0 Security Systems
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
      requireCSRF: false, // Subscribe forms may not always have CSRF tokens
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
        description: "Security checks failed for subscribe endpoint",
        requestData: {
          endpoint: "/api/subscribe",
          headers: Object.fromEntries(request.headers.entries()),
        },
      });

      return securityCheck.errorResponse!;
    }

    const ip = securityCheck.cleanIp;
    sessionId = request.headers.get("x-session-id") || undefined;

    // Parse the request body
    const body = await request.json();

    // Log subscription access
    await AuditLogger.log({
      sessionId,
      action: "SUBSCRIPTION_ACCESS",
      resource: "subscribe",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        endpoint: "/api/subscribe",
        hasEmail: !!(body.email || body.contactEmail),
        hasAgreements: !!(
          body.acceptedTerms ||
          (body.zgodaPrzetwarzanie && body.zgodaKontakt)
        ),
      },
      riskLevel: "low",
    });

    // Map fields to expected format if coming from alternative path
    if (body.email && !body.contactEmail) {
      body.contactEmail = body.email;
      delete body.email;
    }

    if (
      body.acceptedTerms !== undefined &&
      body.zgodaPrzetwarzanie === undefined
    ) {
      body.zgodaPrzetwarzanie = body.acceptedTerms;
      body.zgodaKontakt = body.acceptedTerms; // assume one agreement covers both in simplified form
      delete body.acceptedTerms;
    }

    // Sanitize the data
    const sanitizedBody = sanitizeFormData(body);
    const { contactEmail, zgodaPrzetwarzanie, zgodaKontakt, ...formData } =
      sanitizedBody;

    // Validate input
    if (!contactEmail) {
      await AuditLogger.log({
        sessionId,
        action: "VALIDATION_FAILED",
        resource: "subscribe",
        ipAddress: ip,
        details: { reason: "Missing email" },
        riskLevel: "medium",
        success: false,
      });

      console.error("Email validation failed in subscribe:", {
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
        resource: "subscribe",
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
        resource: "subscribe",
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

    // Save contact data and analytics data separately
    // First save contact data
    const contactSubmission = await prisma.emailSubscription.create({
      data: {
        email: cleanEmail,
        acceptedTerms: zgodaPrzetwarzanie === true,
        acceptedContact: zgodaKontakt === true,
      },
    });

    // Then save form data with reference to contact data
    const formDataObj = { ...formData };

    // SECURITY FIX: Replace raw SQL with secure Prisma ORM call
    const formSubmission = await prisma.formSubmission.create({
      data: {
        emailSubscriptionId: contactSubmission.id,
        formData: formDataObj,
        status: "pending",
      },
      select: {
        id: true,
      },
    });

    // Log successful subscription
    const processingTime = Date.now() - startTime;
    await AuditLogger.log({
      sessionId,
      action: "SUBSCRIPTION_SUCCESS",
      resource: "subscribe",
      resourceId: formSubmission.id,
      formSubmissionId: formSubmission.id,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        email: cleanEmail,
        hasFormData: Object.keys(formDataObj).length > 0,
        processingTime,
      },
      riskLevel: "low",
      success: true,
      responseCode: 201,
      processingTime,
    });

    // Return success without exposing sensitive data
    return NextResponse.json(
      {
        success: true,
        message: "Formularz zapisany pomyślnie",
        submissionId: formSubmission.id,
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
      action: "SUBSCRIPTION_ERROR",
      resource: "subscribe",
      ipAddress: securityCheck?.cleanIp || "unknown",
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime,
      },
      riskLevel: "high",
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "Subscription error",
      responseCode: 500,
      processingTime,
    });

    console.error("Error processing form submission:", error);
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
