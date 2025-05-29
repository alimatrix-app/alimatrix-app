// Enhanced security middleware for AliMatrix 2.0
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCSRFToken, consumeCSRFToken } from "./csrf";
import { checkRateLimit } from "./form-validation";

// Security headers for all API responses
export const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
} as const;

// Request validation schema
const requestValidationSchema = z.object({
  ip: z.string().min(1),
  csrfToken: z.string().min(1),
  userAgent: z.string().optional(),
  origin: z.string().optional(),
});

// Security check result interface
interface SecurityCheckResult {
  success: boolean;
  errorResponse?: NextResponse;
  cleanIp: string;
}

/**
 * Comprehensive security middleware for API routes
 */
export async function performSecurityChecks(
  request: NextRequest,
  options: {
    requireCSRF: boolean;
    rateLimit: { requests: number; windowMs: number };
    allowedOrigins?: string[];
  }
): Promise<SecurityCheckResult> {
  try {
    // Extract client information
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "anonymous";
    const userAgent = request.headers.get("user-agent") || "";
    const origin = request.headers.get("origin") || "";
    const referer = request.headers.get("referer") || ""; // Validate basic request structure
    const baseSchema = z.object({
      ip: z.string().min(1),
      userAgent: z.string().optional(),
      origin: z.string().optional(),
    });

    const schemaWithCSRF = baseSchema.extend({
      csrfToken: z.string().min(1),
    });

    const validationSchema = options.requireCSRF ? schemaWithCSRF : baseSchema;

    const validationData = {
      ip,
      userAgent,
      origin,
      ...(options.requireCSRF && {
        csrfToken: request.headers.get("X-CSRF-Token") || "",
      }),
    };

    const validationResult = validationSchema.safeParse(validationData);

    if (!validationResult.success) {
      return {
        success: false,
        errorResponse: NextResponse.json(
          { error: "Nieprawidłowe żądanie" },
          { status: 400, headers: securityHeaders }
        ),
        cleanIp: ip,
      };
    }

    // Rate limiting check
    if (
      !checkRateLimit(
        ip,
        options.rateLimit.requests,
        options.rateLimit.windowMs
      )
    ) {
      return {
        success: false,
        errorResponse: NextResponse.json(
          { error: "Zbyt wiele żądań. Spróbuj ponownie za kilka minut." },
          {
            status: 429,
            headers: {
              ...securityHeaders,
              "Retry-After": Math.ceil(
                options.rateLimit.windowMs / 1000
              ).toString(),
            },
          }
        ),
        cleanIp: ip,
      };
    }

    // Origin validation (if specified)
    if (options.allowedOrigins && options.allowedOrigins.length > 0) {
      const isValidOrigin = options.allowedOrigins.some(
        (allowedOrigin) =>
          origin.includes(allowedOrigin) || referer.includes(allowedOrigin)
      );

      if (!isValidOrigin && origin !== "") {
        console.warn(
          `Blocked request from unauthorized origin: ${origin}, IP: ${ip}`
        );
        return {
          success: false,
          errorResponse: NextResponse.json(
            { error: "Nieautoryzowane źródło żądania" },
            { status: 403, headers: securityHeaders }
          ),
          cleanIp: ip,
        };
      }
    }

    // CSRF token validation
    if (options.requireCSRF) {
      const csrfToken = request.headers.get("X-CSRF-Token");

      if (!csrfToken) {
        return {
          success: false,
          errorResponse: NextResponse.json(
            {
              error:
                "Brak tokenu bezpieczeństwa. Odśwież stronę i spróbuj ponownie.",
            },
            { status: 403, headers: securityHeaders }
          ),
          cleanIp: ip,
        };
      }

      if (!verifyCSRFToken(csrfToken)) {
        return {
          success: false,
          errorResponse: NextResponse.json(
            {
              error:
                "Nieprawidłowy token bezpieczeństwa. Odśwież stronę i spróbuj ponownie.",
            },
            { status: 403, headers: securityHeaders }
          ),
          cleanIp: ip,
        };
      }

      // Consume the token for one-time use
      consumeCSRFToken(csrfToken);
    }

    // Bot detection patterns
    const suspiciousBotPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /bot/i,
      /spider/i,
      /crawler/i,
    ];

    const isSuspiciousBot = suspiciousBotPatterns.some((pattern) =>
      pattern.test(userAgent)
    );

    if (isSuspiciousBot) {
      console.warn(`Potential bot detected: ${userAgent}, IP: ${ip}`);
      // Don't block immediately, but log for monitoring
    }

    return {
      success: true,
      cleanIp: ip,
    };
  } catch (error) {
    console.error("Security check error:", error);
    return {
      success: false,
      errorResponse: NextResponse.json(
        { error: "Błąd weryfikacji bezpieczeństwa" },
        { status: 500, headers: securityHeaders }
      ),
      cleanIp: "unknown",
    };
  }
}

/**
 * Honeypot field validation
 */
export function validateHoneypot(
  data: any,
  fieldName: string = "notHuman"
): boolean {
  const honeypotValue = data[fieldName];

  if (honeypotValue && honeypotValue.length > 0) {
    console.warn("Bot detected via honeypot field");
    return false;
  }

  return true;
}

/**
 * Enhanced email validation
 */
export function validateEmailSecurity(email: string): {
  isValid: boolean;
  cleanEmail?: string;
  error?: string;
} {
  if (!email || typeof email !== "string") {
    return { isValid: false, error: "Email jest wymagany" };
  }

  // Remove potential malicious characters
  const cleanEmail = email.trim().toLowerCase();

  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: "Nieprawidłowy format adresu email" };
  }

  // Length validation
  if (cleanEmail.length < 5 || cleanEmail.length > 254) {
    return { isValid: false, error: "Nieprawidłowa długość adresu email" };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\./, // Double dots
    /^\./,
    /\.$/, // Leading/trailing dots
    /<|>|'|"|;|`/, // Potential injection characters
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(cleanEmail))) {
    return { isValid: false, error: "Nieprawidłowe znaki w adresie email" };
  }

  return { isValid: true, cleanEmail };
}

/**
 * Request size validation
 */
export function validateRequestSize(
  contentLength: string | null,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): boolean {
  if (!contentLength) return true; // No content-length header

  const size = parseInt(contentLength, 10);
  return !isNaN(size) && size <= maxSizeBytes;
}

/**
 * Generate standard error response with security headers
 */
export function createSecureErrorResponse(
  error: string,
  status: number = 400,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { ...securityHeaders, ...additionalHeaders },
    }
  );
}

/**
 * Generate standard success response with security headers
 */
export function createSecureSuccessResponse(
  data: any,
  status: number = 200,
  additionalHeaders: Record<string, string> = {}
): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { ...securityHeaders, ...additionalHeaders },
  });
}
