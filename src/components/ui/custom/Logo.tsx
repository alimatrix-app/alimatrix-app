import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "small" | "medium" | "large";
}

export function Logo({
  className = "",
  showText = true,
  size = "medium",
}: LogoProps) {
  const sizes = {
    small: { width: 113, height: 40 },
    medium: { width: 170, height: 60 },
    large: { width: 270, height: 96 },
  };

  const { width, height } = sizes[size];

  return (
    <Link href="/" className={`inline-flex items-center pb-4 ${className}`}>
      <Image
        src="/logo.svg"
        alt="AliMatrix Logo"
        width={width}
        height={height}
        priority
      />
      {showText && (
        <span className="ml-2 text-xl font-semibold text-brand-primary sr-only">
          AliMatrix
        </span>
      )}
    </Link>
  );
}
