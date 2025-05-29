// Utilities for validating form submissions
import { z } from "zod";

// Schema for email validation
export const emailSchema = z
  .string()
  .min(5, { message: "Email jest zbyt krótki" })
  .max(100, { message: "Email jest zbyt długi" })
  .email({ message: "Wprowadź poprawny adres email" });

// Schema for consent validation
export const consentSchema = z.boolean().refine((val) => val === true, {
  message: "Zgoda jest wymagana",
});

// Schema for basic form submission
export const formSubmissionSchema = z.object({
  contactEmail: emailSchema,
  zgodaPrzetwarzanie: consentSchema,
  zgodaKontakt: consentSchema,
  submissionDate: z.string(),
  // Optional honeypot field to catch bots - should be empty
  notHuman: z.string().max(0).optional(),

  // Nowe pola dla sądu
  rokDecyzjiSad: z.string().optional(),
  miesiacDecyzjiSad: z.string().optional(),
  rodzajSaduSad: z.enum(["rejonowy", "okregowy", "nie_pamietam"]).optional(),
  apelacjaSad: z.string().optional(),
  sadOkregowyId: z.string().optional(),
  sadRejonowyId: z.string().optional(),
  watekWiny: z
    .enum(["nie", "tak-ja", "tak-druga-strona", "tak-oboje"])
    .optional(),
});

// Sanitize email address
export const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

// Sanitize form data to prevent injection or malicious content
export const sanitizeFormData = (formData: any): any => {
  // Create a deep copy of the form data
  const sanitized = JSON.parse(JSON.stringify(formData));
  // Usunięto logowanie danych email ze względów bezpieczeństwa

  // Remove any potentially dangerous keys from the data
  const dangerousKeys = [
    "__proto__",
    "constructor",
    "prototype",
    "toString",
    "valueOf",
    "eval",
    "setTimeout",
    "setInterval",
    "execScript",
    "Function",
    "document",
    "window",
  ];

  const sanitizeObject = (obj: any) => {
    if (!obj || typeof obj !== "object") return;

    // Remove dangerous keys
    for (const key of dangerousKeys) {
      if (key in obj) {
        delete obj[key];
      }
    } // Recursively sanitize nested objects
    for (const key in obj) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key]);
      } else if (typeof obj[key] === "string") {
        // Apply sanitization to all string values
        obj[key] = sanitizeString(obj[key]);
      }
    }
  };

  sanitizeObject(sanitized);
  return sanitized;
};

// Sanitize string against XSS attacks
export const sanitizeString = (str: string): string => {
  if (typeof str !== "string") return "";

  // Basic sanitization
  let sanitized = str.trim();

  // Replace potentially harmful HTML tags
  sanitized = sanitized
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");

  // Remove any script tags or event handlers
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/on\w+='[^']*'/g, "")
    .replace(/on\w+=\w+/g, "");

  return sanitized;
};

// Rate limiting helpers
const ipRequests = new Map<string, { count: number; timestamp: number }>();
const adminIpRequests = new Map<string, { count: number; timestamp: number }>();

export const checkRateLimit = (
  ip: string,
  limit = 5,
  timeWindow = 60000
): boolean => {
  // In development mode, be more lenient with rate limiting
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const now = Date.now();
  const requestData = ipRequests.get(ip) || { count: 0, timestamp: now };

  // Reset if outside time window
  if (now - requestData.timestamp > timeWindow) {
    requestData.count = 1;
    requestData.timestamp = now;
  } else {
    requestData.count += 1;
  }

  ipRequests.set(ip, requestData);
  // Clean up old entries every 5 minutes
  if (now % 300000 < 1000) {
    cleanupRateLimiter(timeWindow);
  }

  return requestData.count <= limit;
};

// Oddzielny rate limiter dla API administratora (większe limity)
export const checkAdminRateLimit = (
  ip: string,
  limit = 20, // Większy limit dla administracyjnego API
  timeWindow = 60000
): boolean => {
  const now = Date.now();
  const requestData = adminIpRequests.get(ip) || { count: 0, timestamp: now };

  // Reset if outside time window
  if (now - requestData.timestamp > timeWindow) {
    requestData.count = 1;
    requestData.timestamp = now;
  } else {
    requestData.count += 1;
  }

  adminIpRequests.set(ip, requestData);
  // Clean up old entries every 5 minutes
  if (now % 300000 < 1000) {
    cleanupAdminRateLimiter(timeWindow);
  }

  return requestData.count <= limit;
};

// Helper to cleanup rate limiting data
const cleanupRateLimiter = (timeWindow: number): void => {
  const now = Date.now();
  for (const [ip, data] of ipRequests.entries()) {
    if (now - data.timestamp > timeWindow) {
      ipRequests.delete(ip);
    }
  }
};

// Helper to cleanup admin rate limiting data
const cleanupAdminRateLimiter = (timeWindow: number): void => {
  const now = Date.now();
  for (const [ip, data] of adminIpRequests.entries()) {
    if (now - data.timestamp > timeWindow) {
      adminIpRequests.delete(ip);
    }
  }
};

// Schema for path selection
export const pathSelectionSchema = z.object({
  sciezkaWybor: z.enum(["established", "not-established"], {
    required_error: "Proszę wybrać jedną z opcji",
    invalid_type_error: "Nieprawidłowy typ opcji",
  }),
});

// Schema for form data with metadata
export const formDataWithMetadataSchema = z.object({
  formData: z.record(z.any()),
  metaData: z.object({
    lastUpdated: z.number(),
    version: z.string(),
    csrfToken: z.string().optional(),
  }),
});

// CSRF functionality is now imported from the csrf.ts module
import { registerCSRFToken, verifyCSRFToken, consumeCSRFToken } from "./csrf";
export { registerCSRFToken, verifyCSRFToken, consumeCSRFToken };

// Enhanced security patterns for AliMatrix 2.0
export const SECURITY_PATTERNS = {
  // SQL injection patterns
  SQL_INJECTION: [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(;|\-\-|\/\*|\*\/|xp_|@@|char\(|nchar\()/gi,
    /(\b(or|and)\b.*[=<>].*['"])/gi,
  ],

  // XSS patterns
  XSS: [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:|vbscript:|onload=|onerror=|onclick=/gi,
    /<.*['"]\s*javascript:/gi,
  ],

  // Path traversal
  PATH_TRAVERSAL: [/\.\.[\/\\]/g, /[\/\\]\.\.[\/\\]/g, /%2e%2e[\/\\]/gi],

  // Command injection
  COMMAND_INJECTION: [
    /[;&|`$\(\)]/g,
    /\b(wget|curl|nc|netcat|bash|sh|cmd|powershell)\b/gi,
  ],
};

/**
 * Enhanced data sanitization for AliMatrix 2.0
 */
export function enhancedSanitization(
  input: any,
  context: "email" | "text" | "number" | "json" = "text"
): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === "string") {
    let sanitized = input.trim();

    // Context-specific sanitization
    switch (context) {
      case "email":
        // Remove potential malicious characters from email
        sanitized = sanitized.replace(/[<>'";\\/`]/g, "");
        break;

      case "text":
        // Basic XSS prevention
        sanitized = sanitized
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#x27;")
          .replace(/\//g, "&#x2F;");
        break;

      case "number":
        // Only allow numeric characters, dots, and minus
        sanitized = sanitized.replace(/[^0-9.-]/g, "");
        break;
    }

    // Check for security patterns
    for (const [patternType, patterns] of Object.entries(SECURITY_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(sanitized)) {
          console.warn(
            `Potential ${patternType} detected in input: ${sanitized.substring(
              0,
              50
            )}...`
          );
          // Replace suspicious content with safe alternative
          sanitized = sanitized.replace(pattern, "[FILTERED]");
        }
      }
    }

    return sanitized;
  }

  if (typeof input === "object") {
    const sanitizedObj: any = Array.isArray(input) ? [] : {};

    for (const [key, value] of Object.entries(input)) {
      // Sanitize key names
      const cleanKey = enhancedSanitization(key, "text");
      sanitizedObj[cleanKey] = enhancedSanitization(value, "text");
    }

    return sanitizedObj;
  }

  return input;
}

/**
 * Enhanced form data validation with security checks
 */
export function validateFormDataSecurity(data: any): {
  isValid: boolean;
  errors: string[];
  sanitizedData?: any;
} {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Nieprawidłowe dane formularza"] };
  }

  // Check for maximum field count to prevent DOS
  const maxFields = 100;
  const fieldCount = Object.keys(data).length;
  if (fieldCount > maxFields) {
    errors.push(`Zbyt wiele pól w formularzu (maksymalnie ${maxFields})`);
  }

  // Check for maximum string length
  const maxStringLength = 10000;
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && value.length > maxStringLength) {
      errors.push(`Pole ${key} przekracza maksymalną długość`);
    }
  }

  // Sanitize all data
  const sanitizedData = enhancedSanitization(data);

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined,
  };
}

/**
 * Enhanced rate limiting with IP whitelist support
 */
interface RateLimitConfig {
  requests: number;
  windowMs: number;
  whitelist?: string[];
  blockDuration?: number;
}

const blockedIPs = new Map<string, number>();

export function checkEnhancedRateLimit(
  ip: string,
  config: RateLimitConfig
): boolean {
  // Check if IP is whitelisted
  if (config.whitelist?.includes(ip)) {
    return true;
  }

  // Check if IP is currently blocked
  const blockExpiry = blockedIPs.get(ip);
  if (blockExpiry && Date.now() < blockExpiry) {
    console.warn(`Blocked IP attempted access: ${ip}`);
    return false;
  }

  // Remove expired blocks
  if (blockExpiry && Date.now() >= blockExpiry) {
    blockedIPs.delete(ip);
  }

  // Standard rate limiting
  const isAllowed = checkRateLimit(ip, config.requests, config.windowMs);

  // If rate limit exceeded, add to block list
  if (!isAllowed && config.blockDuration) {
    blockedIPs.set(ip, Date.now() + config.blockDuration);
    console.warn(`IP blocked for ${config.blockDuration}ms: ${ip}`);
  }

  return isAllowed;
}
