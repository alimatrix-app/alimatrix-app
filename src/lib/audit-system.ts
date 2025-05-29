// AliMatrix 2.0 - Enhanced Audit System
import { prisma } from "./prisma";
import { NextRequest } from "next/server";

export interface AuditLogEntry {
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  formSubmissionId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  riskLevel?: "low" | "medium" | "high" | "critical";
  success?: boolean;
  errorMessage?: string;
  requestData?: Record<string, any>;
  responseCode?: number;
  processingTime?: number;
  geolocation?: Record<string, any>;
}

export interface SecurityIncidentData {
  incidentType: string;
  severity: "low" | "medium" | "high" | "critical";
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestData?: Record<string, any>;
  description: string;
  affectedResources?: string[];
}

/**
 * Enhanced Audit Logger for AliMatrix 2.0
 */
export class AuditLogger {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          sessionId: entry.sessionId,
          action: entry.action,
          resource: entry.resource,
          resourceId: entry.resourceId,
          formSubmissionId: entry.formSubmissionId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent ? entry.userAgent.substring(0, 500) : null, // Limit length
          details: entry.details,
          riskLevel: entry.riskLevel || "low",
          success: entry.success ?? true,
          errorMessage: entry.errorMessage,
          requestData: this.sanitizeRequestData(entry.requestData),
          responseCode: entry.responseCode,
          processingTime: entry.processingTime,
          geolocation: entry.geolocation,
        },
      });
    } catch (error) {
      // Fallback logging to prevent audit failures from breaking the application
      console.error("Failed to write audit log:", error);
    }
  }

  /**
   * Log a security incident
   */
  static async logSecurityIncident(
    incident: SecurityIncidentData
  ): Promise<void> {
    try {
      await prisma.securityIncident.create({
        data: {
          incidentType: incident.incidentType,
          severity: incident.severity,
          ipAddress: incident.ipAddress,
          userAgent: incident.userAgent
            ? incident.userAgent.substring(0, 500)
            : null,
          sessionId: incident.sessionId,
          requestData: this.sanitizeRequestData(incident.requestData),
          description: incident.description,
          affectedResources: incident.affectedResources
            ? { resources: incident.affectedResources }
            : undefined,
        },
      });
    } catch (error) {
      console.error("Failed to log security incident:", error);
    }
  }

  /**
   * Log form submission access
   */
  static async logFormAccess(
    formSubmissionId: string,
    action: "VIEW" | "DOWNLOAD" | "EXPORT" | "DELETE",
    request: NextRequest,
    userId?: string
  ): Promise<void> {
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers.get("user-agent");
    await this.log({
      userId,
      action,
      resource: "FormSubmission",
      resourceId: formSubmissionId,
      formSubmissionId,
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
      details: {
        timestamp: new Date().toISOString(),
        path: request.nextUrl.pathname,
        method: request.method,
      },
      riskLevel:
        action === "DELETE" ? "high" : action === "EXPORT" ? "medium" : "low",
    }); // Update access count and timestamp
    await prisma.formSubmission.update({
      where: { id: formSubmissionId },
      data: {
        lastAccessedAt: new Date(),
        accessCount: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Log authentication events
   */
  static async logAuthEvent(
    action: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT" | "PASSWORD_RESET",
    request: NextRequest,
    userId?: string,
    details?: Record<string, any>
  ): Promise<void> {
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers.get("user-agent");
    await this.log({
      userId,
      action,
      resource: "Authentication",
      ipAddress: ipAddress ?? undefined,
      userAgent: userAgent ?? undefined,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
      },
      riskLevel: action === "LOGIN_FAILED" ? "medium" : "low",
      success: !action.includes("FAILED"),
    });

    // Log security incident for failed logins
    if (action === "LOGIN_FAILED") {
      await this.logSecurityIncident({
        incidentType: "FAILED_LOGIN",
        severity: "medium",
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent ?? undefined,
        description: `Failed login attempt from IP ${ipAddress}`,
        requestData: details,
      });
    }
  }

  /**
   * Log API rate limiting events
   */
  static async logRateLimit(
    identifier: string,
    endpoint: string,
    action: "RATE_LIMITED" | "RATE_LIMIT_RESET",
    request: NextRequest
  ): Promise<void> {
    const ipAddress = this.getClientIP(request);

    await this.log({
      action,
      resource: "RateLimit",
      resourceId: `${identifier}:${endpoint}`,
      ipAddress: ipAddress ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
      details: {
        identifier,
        endpoint,
        timestamp: new Date().toISOString(),
      },
      riskLevel: action === "RATE_LIMITED" ? "medium" : "low",
    });

    if (action === "RATE_LIMITED") {
      await this.logSecurityIncident({
        incidentType: "RATE_LIMIT_EXCEEDED",
        severity: "medium",
        ipAddress,
        description: `Rate limit exceeded for endpoint ${endpoint} by ${identifier}`,
        requestData: {
          identifier,
          endpoint,
          userAgent: request.headers.get("user-agent"),
        },
      });
    }
  }

  /**
   * Log data retention and cleanup events
   */
  static async logDataRetention(
    action: "DATA_ANONYMIZED" | "DATA_DELETED" | "RETENTION_POLICY_APPLIED",
    resourceType: string,
    resourceIds: string[],
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      action,
      resource: resourceType,
      details: {
        ...details,
        resourceCount: resourceIds.length,
        resourceIds: resourceIds.slice(0, 10), // Log first 10 IDs
        timestamp: new Date().toISOString(),
      },
      riskLevel: action === "DATA_DELETED" ? "high" : "medium",
    });
  }

  /**
   * Get comprehensive audit trail for a form submission
   */
  static async getFormSubmissionAuditTrail(formSubmissionId: string) {
    return await prisma.auditLog.findMany({
      where: {
        OR: [{ formSubmissionId }, { resourceId: formSubmissionId }],
      },
      orderBy: {
        timestamp: "desc",
      },
    });
  }

  /**
   * Get security incidents for a specific IP address
   */
  static async getSecurityIncidentsByIP(ipAddress: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return await prisma.securityIncident.findMany({
      where: {
        ipAddress,
        timestamp: {
          gte: since,
        },
      },
      orderBy: {
        timestamp: "desc",
      },
    });
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalLogs, riskLevelStats, actionStats, incidentStats] =
      await Promise.all([
        prisma.auditLog.count({
          where: {
            timestamp: { gte: since },
          },
        }),
        prisma.auditLog.groupBy({
          by: ["riskLevel"],
          where: {
            timestamp: { gte: since },
          },
          _count: {
            riskLevel: true,
          },
        }),
        prisma.auditLog.groupBy({
          by: ["action"],
          where: {
            timestamp: { gte: since },
          },
          _count: {
            action: true,
          },
          orderBy: {
            _count: {
              action: "desc",
            },
          },
          take: 10,
        }),
        prisma.securityIncident.groupBy({
          by: ["incidentType", "severity"],
          where: {
            timestamp: { gte: since },
          },
          _count: {
            incidentType: true,
          },
        }),
      ]);

    return {
      totalLogs,
      riskLevelStats,
      actionStats,
      incidentStats,
      period: `${days} days`,
    };
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  static async cleanupAuditLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
        riskLevel: {
          in: ["low", "medium"], // Keep high and critical logs longer
        },
      },
    });

    await this.log({
      action: "AUDIT_CLEANUP",
      resource: "AuditLog",
      details: {
        deletedCount: result.count,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays,
      },
      riskLevel: "low",
    });

    return result.count;
  }

  /**
   * Sanitize request data for logging
   */
  private static sanitizeRequestData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      "password",
      "passwd",
      "secret",
      "token",
      "key",
      "apikey",
      "api_key",
      "authorization",
      "auth",
      "csrf",
      "pesel",
      "ssn",
      "credit_card",
      "creditcard",
      "cc",
      "cvv",
      "pin",
      "nip",
    ];

    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== "object" || obj === null) return obj;

      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();

        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          obj[key] = "[REDACTED]";
        } else if (typeof value === "object") {
          obj[key] = sanitizeObject(value);
        } else if (typeof value === "string" && value.length > 1000) {
          obj[key] = value.substring(0, 1000) + "...[TRUNCATED]";
        }
      }

      return obj;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Extract client IP address from request
   */
  private static getClientIP(request: NextRequest): string | undefined {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip");

    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(",")[0].trim();

    return undefined;
  }
}

/**
 * Middleware helper for automatic audit logging
 */
export class AuditMiddleware {
  static createAuditWrapper(
    resource: string,
    action: string,
    riskLevel: "low" | "medium" | "high" | "critical" = "low"
  ) {
    return (handler: Function) => {
      return async (request: NextRequest, ...args: any[]) => {
        const startTime = Date.now();
        const ipAddress = AuditLogger["getClientIP"](request);
        const userAgent = request.headers.get("user-agent");

        try {
          const result = await handler(request, ...args);
          const processingTime = Date.now() - startTime; // Log successful operation
          await AuditLogger.log({
            action,
            resource,
            ipAddress: ipAddress ?? undefined,
            userAgent: userAgent ?? undefined,
            details: {
              method: request.method,
              path: request.nextUrl.pathname,
              statusCode: result?.status || 200,
            },
            riskLevel,
            success: true,
            processingTime,
          });

          return result;
        } catch (error) {
          const processingTime = Date.now() - startTime;

          // Log failed operation
          await AuditLogger.log({
            action,
            resource,
            ipAddress: ipAddress ?? undefined,
            userAgent: userAgent ?? undefined,
            details: {
              method: request.method,
              path: request.nextUrl.pathname,
            },
            riskLevel: "high",
            success: false,
            errorMessage:
              error instanceof Error ? error.message : "Unknown error",
            processingTime,
          });

          throw error;
        }
      };
    };
  }
}
