import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

// Left-aligned heavy uppercase section title (see design/design-system.md).
// Upright on purpose: titles are Mongolian Cyrillic.
export function SectionTitle({
  title,
  description,
  action,
  className,
}: SectionTitleProps) {
  return (
    <div
      className={cn("mb-6 flex items-end justify-between gap-4 md:mb-8", className)}
    >
      <div>
        <h2 className="font-display text-[22px] font-black uppercase leading-[1.15] tracking-tight text-ink sm:text-[26px] md:text-[34px]">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-ink/60 md:text-base">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
