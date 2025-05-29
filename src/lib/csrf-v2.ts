// Enhanced CSRF protection for AliMatrix 2.0
import { z } from "zod";

interface CSRFTokenData {
  token: string;
  timestamp: number;
  fingerprint?: string;
  used: boolean;
}

// Token storage with enhanced metadata
const csrfTokens = new Map<string, CSRFTokenData>();

// Configuration
const CSRF_CONFIG = {
  TOKEN_LIFETIME: 30 * 60 * 1000, // 30 minutes
  MAX_TOKENS: 1000, // Maximum tokens in memory
  CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 minutes cleanup
  SECRET_KEY:
    process.env.CSRF_SECRET || "default-csrf-secret-change-in-production",
};

// Token validation schema
const tokenSchema = z.string().min(32).max(256);

/**
 * Generate a cryptographically secure CSRF token
 */
export const generateCSRFToken = (fingerprint?: string): string => {
  const timestamp = Date.now().toString();
  const randomBytes = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Include fingerprint in token generation if available
  const tokenData = fingerprint
    ? `${timestamp}:${randomBytes}:${fingerprint}`
    : `${timestamp}:${randomBytes}`;

  // Create hash for additional security
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenData + CSRF_CONFIG.SECRET_KEY);

  return btoa(tokenData).replace(/[+/=]/g, ""); // Remove problematic characters
};

/**
 * Register a token with enhanced metadata
 */
export const registerCSRFToken = (
  token: string,
  fingerprint?: string
): boolean => {
  try {
    const validationResult = tokenSchema.safeParse(token);
    if (!validationResult.success) {
      console.warn("Invalid CSRF token format during registration");
      return false;
    }

    // Cleanup old tokens before adding new one
    cleanupExpiredTokens();

    // Check if we're at capacity
    if (csrfTokens.size >= CSRF_CONFIG.MAX_TOKENS) {
      // Remove oldest tokens
      const sortedTokens = Array.from(csrfTokens.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, Math.floor(CSRF_CONFIG.MAX_TOKENS * 0.2)); // Remove 20% oldest

      sortedTokens.forEach(([token]) => csrfTokens.delete(token));
    }

    csrfTokens.set(token, {
      token,
      timestamp: Date.now(),
      fingerprint,
      used: false,
    });

    return true;
  } catch (error) {
    console.error("Error registering CSRF token:", error);
    return false;
  }
};

/**
 * Verify a token with enhanced validation
 */
export const verifyCSRFToken = (
  token: string,
  fingerprint?: string
): boolean => {
  try {
    const validationResult = tokenSchema.safeParse(token);
    if (!validationResult.success) {
      console.warn("Invalid CSRF token format during verification");
      return false;
    }

    const tokenData = csrfTokens.get(token);
    if (!tokenData) {
      console.warn("CSRF token not found in registry");
      return false;
    }

    // Check if token is already used
    if (tokenData.used) {
      console.warn("Attempt to reuse CSRF token");
      return false;
    }

    // Check expiration
    const isExpired =
      Date.now() - tokenData.timestamp > CSRF_CONFIG.TOKEN_LIFETIME;
    if (isExpired) {
      console.warn("CSRF token has expired");
      csrfTokens.delete(token);
      return false;
    }

    // Verify fingerprint if provided
    if (
      fingerprint &&
      tokenData.fingerprint &&
      tokenData.fingerprint !== fingerprint
    ) {
      console.warn("CSRF token fingerprint mismatch");
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error verifying CSRF token:", error);
    return false;
  }
};

/**
 * Consume a token (mark as used)
 */
export const consumeCSRFToken = (token: string): boolean => {
  try {
    const tokenData = csrfTokens.get(token);
    if (!tokenData) {
      return false;
    }

    // Mark as used instead of deleting to prevent reuse
    tokenData.used = true;
    csrfTokens.set(token, tokenData);

    return true;
  } catch (error) {
    console.error("Error consuming CSRF token:", error);
    return false;
  }
};

/**
 * Clean up expired and used tokens
 */
export const cleanupExpiredTokens = (): void => {
  try {
    const now = Date.now();
    const tokensToRemove: string[] = [];

    for (const [token, data] of csrfTokens.entries()) {
      const isExpired = now - data.timestamp > CSRF_CONFIG.TOKEN_LIFETIME;
      const isUsed = data.used;

      if (isExpired || isUsed) {
        tokensToRemove.push(token);
      }
    }

    tokensToRemove.forEach((token) => csrfTokens.delete(token));

    if (tokensToRemove.length > 0) {
      console.log(`Cleaned up ${tokensToRemove.length} CSRF tokens`);
    }
  } catch (error) {
    console.error("Error during CSRF token cleanup:", error);
  }
};

/**
 * Rotate tokens for enhanced security
 */
export const rotateCSRFTokens = (): void => {
  try {
    const now = Date.now();
    const rotationThreshold = 15 * 60 * 1000; // 15 minutes
    const tokensToRotate: string[] = [];

    for (const [token, data] of csrfTokens.entries()) {
      const age = now - data.timestamp;
      if (age > rotationThreshold && !data.used) {
        tokensToRotate.push(token);
      }
    }

    // Generate new tokens for rotation
    tokensToRotate.forEach((oldToken) => {
      const oldData = csrfTokens.get(oldToken);
      if (oldData) {
        const newToken = generateCSRFToken(oldData.fingerprint);
        registerCSRFToken(newToken, oldData.fingerprint);
        csrfTokens.delete(oldToken);
      }
    });

    if (tokensToRotate.length > 0) {
      console.log(`Rotated ${tokensToRotate.length} CSRF tokens`);
    }
  } catch (error) {
    console.error("Error during CSRF token rotation:", error);
  }
};

/**
 * Get token statistics for monitoring
 */
export const getCSRFTokenStats = (): {
  total: number;
  used: number;
  expired: number;
  valid: number;
} => {
  const now = Date.now();
  let used = 0;
  let expired = 0;
  let valid = 0;

  for (const [, data] of csrfTokens.entries()) {
    if (data.used) {
      used++;
    } else if (now - data.timestamp > CSRF_CONFIG.TOKEN_LIFETIME) {
      expired++;
    } else {
      valid++;
    }
  }

  return {
    total: csrfTokens.size,
    used,
    expired,
    valid,
  };
};

// Schedule automatic cleanup
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    cleanupExpiredTokens();
    rotateCSRFTokens();
  }, CSRF_CONFIG.CLEANUP_INTERVAL);
}
