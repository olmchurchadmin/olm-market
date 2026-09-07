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
        width={900}
        height={281}
        priority={priority}
        className="h-12 w-auto max-w-[min(100%,300px)] object-contain object-left sm:h-14 sm:max-w-[360px]"
      />
    </Link>
  );
}
