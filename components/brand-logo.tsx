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
      aria-label="Our Lady of Mercy Parish"
    >
      <Image
        src="/logo-olm.png"
        alt="애너하임 한인 천주교회 · Our Lady of Mercy Parish"
        width={800}
        height={213}
        priority={priority}
        className="h-8 w-auto max-w-[min(100%,220px)] object-contain object-left sm:h-9 sm:max-w-[280px]"
      />
    </Link>
  );
}
