// AliMatrix 2.0 - Enhanced Next.js configuration with comprehensive security
import type { NextConfig } from "next";

const securityHeaders = [
  // Enhanced Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  // X-Frame-Options - zapobiega clickjackingowi
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // X-Content-Type-Options - zapobiega sniffingowi MIME
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // X-XSS-Protection - dodatkowa ochrona przed XSS
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Referrer-Policy - kontrola informacji o źródle
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Enhanced Permissions-Policy
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "interest-cohort=()",
      "payment=()",
      "usb=()",
      "bluetooth=()",
      "serial=()",
      "midi=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
    ].join(", "),
  },
  // Strict-Transport-Security - wymuszanie HTTPS
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Cross-Origin-Embedder-Policy
  {
    key: "Cross-Origin-Embedder-Policy",
    value: "credentialless",
  },
  // Cross-Origin-Opener-Policy
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  // Cross-Origin-Resource-Policy
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false, // Ukrywa nagłówek X-Powered-By

  // Enhanced build optimization (swcMinify is now enabled by default in Next.js 15)
  compress: true,

  // Image optimization
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Enhanced ESLint configuration
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === "production",
    dirs: ["src"],
  },

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === "production",
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["@prisma/client", "zod", "react-hook-form"],
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enhanced security headers configuration
  async headers() {
    return [
      {
        source: "/:path*", // Dotyczy wszystkich ścieżek
        headers: securityHeaders,
      },
      // Static assets with longer cache
      {
        source: "/_next/static/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // API routes with stricter CSP
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; script-src 'none'",
          },
        ],
      },
    ];
  },

  // Enhanced redirects for security
  async redirects() {
    return [
      // Redirect old admin paths
      {
        source: "/admin",
        destination: "/admin/login",
        permanent: false,
      },
      // Block access to sensitive files
      {
        source: "/.env",
        destination: "/404",
        permanent: true,
      },
      {
        source: "/prisma/:path*",
        destination: "/404",
        permanent: true,
      },
    ];
  },

  // Enhanced rewrites for API versioning
  async rewrites() {
    return [
      // API v2 routes
      {
        source: "/api/v2/submit",
        destination: "/api/submit-form-v2",
      },
      {
        source: "/api/v2/subscribe",
        destination: "/api/subscribe-v2",
      },
    ];
  },
};

export default nextConfig;
