import type { CSSProperties } from "react";

/**
 * Stagger helper — feeds the --reveal-delay custom property consumed by the
 * [data-reveal] rules in globals.css.
 */
export function revealDelay(ms: number): CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}
