// AliMatrix 2.0 - Enhanced middleware with comprehensive security
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers for all responses
const getSecurityHeaders = () => {
  const isDev = process.env.NODE_ENV === "development";

  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": isDev
      ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
      : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  };
};

// Rate limiting storage
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function getRealIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIP || "unknown";
}

function checkRateLimit(ip: string, limit: number, windowMs: number): boolean {
  // In development mode, be more lenient with rate limiting
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}

// Cleanup rate limit records every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getRealIP(request);
  const securityHeaders = getSecurityHeaders();

  // Apply rate limiting (more strict for API routes)
  const isApiRoute = pathname.startsWith("/api/");
  const rateLimit = isApiRoute ? 30 : 60; // API: 30/min, Pages: 60/min

  if (!checkRateLimit(ip, rateLimit, 60000)) {
    console.warn(`Rate limit exceeded for IP: ${ip}, path: ${pathname}`);
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: {
        ...securityHeaders,
        "Retry-After": "60",
      },
    });
  }

  // Enhanced admin route protection
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginPage = pathname === "/admin/login";

  if (isAdminRoute) {
    // Additional security for admin routes
    const userAgent = request.headers.get("user-agent") || "";
    const origin = request.headers.get("origin") || "";

    // Block suspicious user agents
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /python/i,
      /scanner/i,
      /crawler/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
      console.warn(
        `Suspicious access attempt to admin from IP: ${ip}, UA: ${userAgent}`
      );
      return new NextResponse("Forbidden", {
        status: 403,
        headers: securityHeaders,
      });
    }

    // Check authentication
    const isAuthenticated = request.cookies.has("admin_auth_token");
    const authToken = request.cookies.get("admin_auth_token")?.value;

    // Validate token format (basic check)
    if (isAuthenticated && authToken) {
      const tokenParts = authToken.split(".");
      if (tokenParts.length !== 3) {
        // Invalid token format, clear it
        const response = NextResponse.redirect(
          new URL("/admin/login", request.url)
        );
        response.cookies.delete("admin_auth_token");
        return response;
      }
    }

    if (!isLoginPage && !isAuthenticated) {
      console.log(
        `Unauthenticated access attempt to admin: ${pathname} from IP: ${ip}`
      );
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    if (isLoginPage && isAuthenticated) {
      return NextResponse.redirect(
        new URL("/admin/subscriptions", request.url)
      );
    }
  }

  // Enhanced API security
  if (isApiRoute) {
    const contentType = request.headers.get("content-type") || "";
    const method = request.method;

    // Validate content type for POST/PUT requests
    if (["POST", "PUT", "PATCH"].includes(method)) {
      if (!contentType.includes("application/json")) {
        return new NextResponse("Invalid Content-Type", {
          status: 400,
          headers: securityHeaders,
        });
      }
    } // Block requests with suspicious headers (but allow in development)
    const suspiciousHeaders = [
      "x-real-ip",
      "x-forwarded-host",
      "x-cluster-client-ip",
    ];

    for (const header of suspiciousHeaders) {
      const value = request.headers.get(header);
      if (
        value &&
        process.env.NODE_ENV !== "development" && // Skip this check in development
        (value.includes("..") ||
          value.includes("localhost") ||
          value.includes("127.0.0.1"))
      ) {
        console.warn(
          `Suspicious header detected: ${header}=${value} from IP: ${ip}`
        );
        return new NextResponse("Forbidden", {
          status: 403,
          headers: securityHeaders,
        });
      }
    }
  }

  // Create response with security headers
  const response = NextResponse.next();

  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add cache control for static assets
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/public/")
  ) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // Add HSTS for HTTPS
  if (request.nextUrl.protocol === "https:") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  return response;
}

// Konfiguracja określa, dla których ścieżek middleware będzie uruchamiane
export const config = {
  // Enhanced matcher for better security coverage
  matcher: [
    "/admin/:path*", // Admin routes
    "/api/:path*", // API routes
    "/((?!_next/static|_next/image|favicon.ico|public/).*)", // All pages except static
  ],
};
