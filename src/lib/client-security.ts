// Client-side security utilities for forms
import { z } from "zod";

// Generate a CSRF token with added entropy
export const generateCSRFToken = (): string => {
  // Create a token with timestamp and random data for additional entropy
  const timestamp = Date.now();
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Add browser fingerprinting data if available (simple version)
  const fingerprint = generateSimpleFingerprint();

  return `${timestamp}:${randomPart}:${fingerprint}`;
};

// Generate a simple browser fingerprint for additional security
const generateSimpleFingerprint = (): string => {
  try {
    // Simple fingerprinting - in production would be more comprehensive
    const screenData = `${window.screen.width}x${window.screen.height}`;
    const timeZone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
    const userAgent = navigator.userAgent; // Create a hash of the combined data
    const fingerprintData = `${screenData}|${timeZone}|${userAgent.substring(
      0,
      50
    )}`;
    return btoa(encodeURIComponent(fingerprintData)).substring(0, 20);
  } catch {
    // Fallback if fingerprinting fails
    return Math.random().toString(36).substring(2, 10);
  }
};

// Store CSRF token in localStorage and register with server
export const storeCSRFToken = (token: string): void => {
  try {
    localStorage.setItem("csrf_token", token);

    // Also try to register the token with the server
    fetch("/api/register-csrf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest", // Standard CSRF protection header
      },
      body: JSON.stringify({ token }),
    }).catch(() => {
      // Silent fail - client will still have the token locally
    });
  } catch (e) {
    // Silent fail - we don't want to show errors to end users
  }
};

// Get CSRF token from localStorage
export const getCSRFToken = (): string | null => {
  return localStorage.getItem("csrf_token");
};

// Client-side email validation
export const validateEmail = (email: string): boolean => {
  const emailSchema = z.string().min(5).max(100).email();
  try {
    emailSchema.parse(email);
    return true;
  } catch {
    return false;
  }
};

// Check if a safe time window has passed since last form submission
// to prevent rapid form submissions and protect against double-click issues
export const safeToSubmit = (): boolean => {
  const lastSubmission = localStorage.getItem("last_submission_time");
  if (!lastSubmission) return true;

  const lastSubmissionTime = parseInt(lastSubmission, 10);
  const now = Date.now();

  // Require at least 500ms between submissions - tylko chronimy przed podwójnym kliknięciem
  // zmniejszone z 5000ms (5 sekund) na bardziej rozsądną wartość
  return now - lastSubmissionTime > 500;
};

// Record a submission time
export const recordSubmission = (): void => {
  localStorage.setItem("last_submission_time", Date.now().toString());
};

// Encrypt sensitive data client-side using a stronger approach
// This uses AES encryption which is more secure than simple base64 encoding
export const encryptData = async (data: any): Promise<string> => {
  try {
    // Use a consistent key derivation approach
    // In production, this would use a more secure key management system
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Create a key from a passphrase + salt
    // Note: In production, use a secure key management system
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode("AliMatrix-SecureStorage"),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    // Derive a key for AES
    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    // Generate initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Convert data to string if it's not already
    const dataString = typeof data === "string" ? data : JSON.stringify(data);

    // Encrypt the data
    const encryptedContent = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encoder.encode(dataString)
    );

    // Combine the salt, iv, and encrypted content into a single array
    const result = new Uint8Array(
      salt.length + iv.length + encryptedContent.byteLength
    );
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encryptedContent), salt.length + iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...result));
  } catch (e) {
    console.error("Failed to encrypt data:", e);
    // Fallback to simple obfuscation if encryption fails
    return btoa(
      encodeURIComponent(typeof data === "string" ? data : JSON.stringify(data))
    );
  }
};

// Decrypt data
export const decryptData = async (encryptedData: string): Promise<any> => {
  try {
    // Convert from base64
    const binaryString = atob(encryptedData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Extract salt, iv, and encrypted content
    const salt = bytes.slice(0, 16);
    const iv = bytes.slice(16, 28);
    const encryptedContent = bytes.slice(28);

    // Recreate the key
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode("AliMatrix-SecureStorage"),
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    // Decrypt the data
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      encryptedContent
    );

    const decoded = new TextDecoder().decode(decrypted);

    // Try to parse as JSON, return as string if not valid JSON
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  } catch (e) {
    console.error("Failed to decrypt data:", e);
    try {
      // Fallback for backwards compatibility
      return JSON.parse(decodeURIComponent(atob(encryptedData)));
    } catch {
      try {
        return decodeURIComponent(atob(encryptedData));
      } catch {
        return null;
      }
    }
  }
};

// Legacy methods for backwards compatibility
export const obfuscateData = (data: string): string => {
  try {
    // Ensure we're working with strings
    const stringData = typeof data === "string" ? data : JSON.stringify(data);
    return btoa(encodeURIComponent(stringData));
  } catch (e) {
    console.error("Failed to obfuscate data", e);
    // Fallback - return data as is but don't throw
    return typeof data === "string" ? data : JSON.stringify(data);
  }
};

export const deobfuscateData = (data: string): string => {
  try {
    // Check if the string is base64 encoded
    if (!isBase64(data)) {
      console.warn("Data is not properly base64 encoded, returning as is");
      return data;
    }

    return decodeURIComponent(atob(data));
  } catch (e) {
    console.error("Failed to deobfuscate data", e);
    // Return original data if decoding fails
    return data;
  }
};

// Utility function to check if a string is valid base64
function isBase64(str: string): boolean {
  try {
    // Quick check for characters that aren't valid in base64
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(str)) {
      return false;
    }

    // Try to decode - will throw if invalid
    atob(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Enhanced security storage for AliMatrix 2.0
 */
export class SecureStorage {
  private static readonly STORAGE_PREFIX = "alimatrix_secure_";
  private static readonly ENCRYPTION_KEY = "alimatrix-2024-key";
  static setItem(key: string, value: any, encrypt: boolean = true): boolean {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const finalValue = encrypt
        ? this.encrypt(serializedValue)
        : serializedValue;
      localStorage.setItem(this.STORAGE_PREFIX + key, finalValue);
      return true;
    } catch (error) {
      console.warn("Failed to store item securely:", error);
      return false;
    }
  }
  static getItem(key: string, decrypt: boolean = true): any {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return null;
    }

    try {
      const item = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!item) return null;

      const value = decrypt ? this.decrypt(item) : item;
      return JSON.parse(value);
    } catch (error) {
      console.warn("Failed to retrieve item securely:", error);
      return null;
    }
  }
  static removeItem(key: string): void {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return;
    }

    localStorage.removeItem(this.STORAGE_PREFIX + key);
  }
  static clear(): void {
    // Check if we're in a server environment
    if (typeof window === "undefined") {
      return;
    }

    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(this.STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }

  private static encrypt(text: string): string {
    // Simple obfuscation - in production use proper encryption
    return btoa(text.split("").reverse().join(""));
  }

  private static decrypt(text: string): string {
    try {
      return atob(text).split("").reverse().join("");
    } catch {
      return text; // Fallback for non-encrypted data
    }
  }
}

/**
 * Enhanced CSRF token management with validation
 */
export const enhancedStoreCSRFToken = (token: string): boolean => {
  try {
    // Validate token format
    if (!token || token.length < 16) {
      console.warn("Invalid CSRF token format");
      return false;
    }

    // Store with timestamp and fingerprint
    const tokenData = {
      token,
      timestamp: Date.now(),
      fingerprint: generateSimpleFingerprint(),
      userAgent: navigator.userAgent.substring(0, 100), // Limited UA string
    };

    SecureStorage.setItem("csrf_token_data", tokenData);

    // Register with server
    fetch("/api/register-csrf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        token,
        fingerprint: tokenData.fingerprint,
      }),
    }).catch(() => {
      console.warn("Failed to register CSRF token with server");
    });

    return true;
  } catch (error) {
    console.warn("Failed to store CSRF token:", error);
    return false;
  }
};

/**
 * Get CSRF token with validation
 */
export const getEnhancedCSRFToken = (): string | null => {
  try {
    const tokenData = SecureStorage.getItem("csrf_token_data");
    if (!tokenData) return null;

    // Check token age (30 minutes max)
    const maxAge = 30 * 60 * 1000;
    if (Date.now() - tokenData.timestamp > maxAge) {
      SecureStorage.removeItem("csrf_token_data");
      return null;
    }

    // Validate fingerprint
    const currentFingerprint = generateSimpleFingerprint();
    if (tokenData.fingerprint !== currentFingerprint) {
      console.warn("CSRF token fingerprint mismatch");
      SecureStorage.removeItem("csrf_token_data");
      return null;
    }

    return tokenData.token;
  } catch (error) {
    console.warn("Failed to retrieve CSRF token:", error);
    return null;
  }
};

/**
 * Session management utilities
 */
export class SessionManager {
  private static readonly SESSION_KEY = "session_data";
  private static readonly SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour

  static createSession(userId: string, metadata: any = {}): boolean {
    try {
      const sessionData = {
        userId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        fingerprint: generateSimpleFingerprint(),
        metadata,
      };

      SecureStorage.setItem(this.SESSION_KEY, sessionData);
      return true;
    } catch (error) {
      console.warn("Failed to create session:", error);
      return false;
    }
  }

  static getSession(): any {
    try {
      const sessionData = SecureStorage.getItem(this.SESSION_KEY);
      if (!sessionData) return null;

      // Check session timeout
      const isExpired =
        Date.now() - sessionData.lastActivity > this.SESSION_TIMEOUT;
      if (isExpired) {
        this.destroySession();
        return null;
      }

      // Update last activity
      sessionData.lastActivity = Date.now();
      SecureStorage.setItem(this.SESSION_KEY, sessionData);

      return sessionData;
    } catch (error) {
      console.warn("Failed to get session:", error);
      return null;
    }
  }

  static destroySession(): void {
    SecureStorage.removeItem(this.SESSION_KEY);
  }

  static isSessionValid(): boolean {
    return this.getSession() !== null;
  }
}

/**
 * Form security utilities
 */
export const validateFormSecurity = (
  formElement: HTMLFormElement
): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Check for honeypot fields
  const honeypotFields = formElement.querySelectorAll("[data-honeypot]");
  honeypotFields.forEach((field) => {
    if ((field as HTMLInputElement).value.trim() !== "") {
      errors.push("Bot detected via honeypot");
    }
  });

  // Check CSRF token
  const csrfToken = getEnhancedCSRFToken();
  if (!csrfToken) {
    errors.push("Missing or invalid CSRF token");
  }

  // Validate form fields
  const inputs = formElement.querySelectorAll("input, textarea, select");
  inputs.forEach((input) => {
    const element = input as HTMLInputElement;
    const value = element.value;

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,
      /\bexec\b/i,
      /\beval\b/i,
    ];

    if (suspiciousPatterns.some((pattern) => pattern.test(value))) {
      errors.push(`Suspicious content detected in field: ${element.name}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
