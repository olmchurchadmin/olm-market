import Image from "next/image";
import Link from "next/link";

export function BrandLogo({
  priority = false,
  className = "",
}: {
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`inline-flex min-w-0 items-center ${className}`}
      aria-label="나눔장터"
    >
      <Image
        src="/logo-olm.png"
        alt="나눔장터"
        width={194}
        height={150}
        priority={priority}
        className="h-11 w-auto max-w-[min(100%,160px)] object-contain object-left sm:h-12 sm:max-w-[180px]"
      />
    </Link>
  );
}
