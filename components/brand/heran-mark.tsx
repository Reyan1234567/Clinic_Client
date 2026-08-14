import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Theme-aware Heran mark.
 * Light UI → heran-dark.png; dark UI → heran-light.png.
 * Both assets render; CSS picks which is visible via the `dark` class on <html>
 * (set before paint by the theme boot script).
 */
export function HeranMark({
  size = 32,
  className,
  priority,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/heran-light.png"
        alt="Heran Specialty Dental"
        width={size}
        height={size}
        priority={priority}
        className="h-full w-full object-contain dark:hidden"
      />
      <Image
        src="/heran-dark.png"
        alt=""
        aria-hidden
        width={size}
        height={size}
        priority={priority}
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}
