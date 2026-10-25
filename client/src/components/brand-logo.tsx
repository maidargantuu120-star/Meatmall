import { useId } from "react";
import { BRAND } from "@/lib/brand";

const STEAK =
  "M112 108 C116 78 170 62 224 72 C262 80 272 106 258 132 C246 154 204 160 162 157 C124 154 108 134 112 108 Z";

// Meat Mall badge logo. Inline SVG (not <img>) so the Alfa Slab One web font
// applies; master artwork lives in design/logo/meat-mall-logo.svg.
export function BrandLogo({ className }: { className?: string }) {
  // Unique ids so several logos on one page don't share (possibly hidden) defs
  const uid = useId().replace(/:/g, "");
  const sticker = `mm-sticker-${uid}`;
  const face = `mm-face-${uid}`;

  return (
    <svg
      viewBox="0 0 480 380"
      role="img"
      aria-label={BRAND.name}
      className={className}
    >
      <defs>
        <filter id={sticker} x="-10%" y="-10%" width="120%" height="120%">
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius="7"
            result="grow"
          />
          <feFlood floodColor="#ffffff" />
          <feComposite in2="grow" operator="in" result="outline" />
          <feMerge>
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={face}>
          <path d={STEAK} />
        </clipPath>
      </defs>

      <g
        filter={`url(#${sticker})`}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        {/* Badge */}
        <path
          d="M100 128 H380 L420 178 V246 L240 350 L60 246 V178 Z"
          fill="#141414"
          stroke="#141414"
          strokeWidth="12"
        />
        <path
          d="M110 142 H370 L404 184 V238 L240 332 L76 238 V184 Z"
          fill="#ffffff"
        />

        {/* Steam */}
        <path
          d="M150 52 C142 42 158 34 150 22 M176 48 C168 38 184 30 176 18"
          fill="none"
          stroke="#141414"
          strokeWidth="6"
        />

        {/* Steak */}
        <path
          transform="translate(0 16)"
          d={STEAK}
          fill="#8f0016"
          stroke="#141414"
          strokeWidth="7"
        />
        <path d={STEAK} fill="#e4002b" stroke="#141414" strokeWidth="7" />
        <g clipPath={`url(#${face})`} stroke="#8f0016" strokeWidth="8">
          <path d="M168 74 L150 150 M194 70 L176 156 M220 74 L202 156 M246 86 L230 150" />
        </g>
        <path
          d="M128 104 C132 90 148 84 162 84"
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="6"
        />

        {/* Fork */}
        <path d="M298 128 L276 196" stroke="#141414" strokeWidth="16" />
        <path d="M298 128 L276 196" stroke="#d9d9d9" strokeWidth="8" />
        <path
          d="M287 110 H313 L309 132 H291 Z"
          fill="#d9d9d9"
          stroke="#141414"
          strokeWidth="5"
        />

        {/* Sausage */}
        <path
          d="M388 66 L406 56 L400 84 Z M248 136 L232 152 L256 154 Z"
          fill="#141414"
          stroke="#141414"
          strokeWidth="4"
        />
        <path
          d="M262 120 Q300 64 366 74"
          fill="none"
          stroke="#141414"
          strokeWidth="54"
        />
        <path
          d="M262 120 Q300 64 366 74"
          fill="none"
          stroke="#e4002b"
          strokeWidth="40"
        />
        <path
          d="M280 102 Q304 76 338 72"
          fill="none"
          stroke="#ff8a98"
          strokeWidth="7"
        />

        {/* Ribbon */}
        <path
          d="M44 266 H74 L74 288 Z M436 266 H406 L406 288 Z"
          fill="#8f0016"
          stroke="#141414"
          strokeWidth="6"
        />
        <path
          d="M30 182 H450 L436 224 L450 266 H30 L44 224 Z"
          fill="#e4002b"
          stroke="#141414"
          strokeWidth="8"
        />
        <g
          fontFamily="'Alfa Slab One', 'Rockwell Extra Bold', 'Roboto Slab', Georgia, serif"
          textAnchor="middle"
          stroke="none"
        >
          <text
            x="243"
            y="247"
            fontSize="60"
            textLength="360"
            lengthAdjust="spacingAndGlyphs"
            fill="#8f0016"
          >
            {BRAND.name}
          </text>
          <text
            x="240"
            y="244"
            fontSize="60"
            textLength="360"
            lengthAdjust="spacingAndGlyphs"
            fill="#ffffff"
          >
            {BRAND.name}
          </text>
          <text
            x="240"
            y="296"
            fontSize="22"
            textLength="118"
            lengthAdjust="spacingAndGlyphs"
            fill="#141414"
          >
            • 2014 •
          </text>
        </g>
      </g>
    </svg>
  );
}
