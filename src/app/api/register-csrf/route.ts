// Route handler for CSRF token registration - Enhanced with AliMatrix 2.0 Security Systems
import { NextRequest, NextResponse } from "next/server";
import { registerCSRFToken } from "@/lib/csrf-v2";
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
      requireCSRF: false, // This endpoint registers CSRF tokens, so no token required
      rateLimit: { requests: 10, windowMs: 60000 }, // More lenient for token registration
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(","),
    });

    if (!securityCheck.success) {
      // Log security incident
      await AuditLogger.logSecurityIncident({
        incidentType: "SECURITY_CHECK_FAILED",
        severity: "medium",
        ipAddress: securityCheck.cleanIp,
        userAgent: request.headers.get("user-agent") || undefined,
        description: "Security checks failed for register-csrf endpoint",
        requestData: {
          endpoint: "/api/register-csrf",
          headers: Object.fromEntries(request.headers.entries()),
        },
      });

      return securityCheck.errorResponse!;
    }

    const ip = securityCheck.cleanIp;
    sessionId = request.headers.get("x-session-id") || undefined;

    // Parse the request body
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      await AuditLogger.log({
        sessionId,
        action: "CSRF_REGISTRATION_FAILED",
        resource: "register-csrf",
        ipAddress: ip,
        details: { reason: "Invalid or missing token" },
        riskLevel: "medium",
        success: false,
      });

      return NextResponse.json(
        { error: "Invalid token" },
        {
          status: 400,
          headers: securityHeaders,
        }
      );
    } // Register the token with the enhanced CSRF system
    try {
      registerCSRFToken(token);

      // Token registered successfully
    } catch (registrationError) {
      await AuditLogger.log({
        sessionId,
        action: "CSRF_REGISTRATION_FAILED",
        resource: "register-csrf",
        ipAddress: ip,
        details: { reason: "Token registration failed" },
        riskLevel: "medium",
        success: false,
      });

      return NextResponse.json(
        { error: "Failed to register CSRF token" },
        {
          status: 500,
          headers: securityHeaders,
        }
      );
    }

    // Log successful token registration
    const processingTime = Date.now() - startTime;
    await AuditLogger.log({
      sessionId,
      action: "CSRF_TOKEN_REGISTERED",
      resource: "register-csrf",
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        tokenRegistered: true,
        processingTime,
      },
      riskLevel: "low",
      success: true,
      responseCode: 200,
      processingTime,
    });

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: securityHeaders,
      }
    );
  } catch (error) {
    const processingTime = Date.now() - startTime;

    // Log error
    await AuditLogger.log({
      sessionId,
      action: "CSRF_REGISTRATION_ERROR",
      resource: "register-csrf",
      ipAddress: securityCheck?.cleanIp || "unknown",
      userAgent: request.headers.get("user-agent") || undefined,
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        processingTime,
      },
      riskLevel: "high",
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "CSRF registration error",
      responseCode: 500,
      processingTime,
    });

    console.error("Error registering CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to register CSRF token" },
      {
        status: 500,
        headers: securityHeaders,
      }
    );
  }
}
