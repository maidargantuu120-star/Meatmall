import React, { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  content: ReactNode;
  illustration?: string;
  size?: "sm" | "md" | "lg";
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export const HelpTooltip = ({
  content,
  illustration,
  size = "md",
  side = "top",
  align = "center",
}: HelpTooltipProps) => {
  // Icon size based on the size prop
  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Width of the tooltip content based on the size prop
  const tooltipWidths = {
    sm: "max-w-xs",
    md: "max-w-sm",
    lg: "max-w-md",
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`text-gray-400 hover:text-gray-600 focus:outline-none ${iconSizes[size]}`}
            aria-label="Тусламж"
          >
            <HelpCircle className="w-full h-full" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={`${tooltipWidths[size]} p-0 rounded-lg overflow-hidden shadow-lg border-0`}
        >
          <div className="bg-white text-gray-800 p-4 rounded-lg">
            {illustration && (
              <div className="mb-3 flex justify-center">
                <img
                  src={illustration}
                  alt="Help illustration"
                  className="max-h-40 rounded"
                />
              </div>
            )}
            <div className="text-sm">{content}</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
