type ArcMotifProps = {
  className?: string;
  variant?: "gold" | "teal" | "outline";
};

/**
 * The brand's one recurring geometric gesture, derived from the logo's
 * arc-and-circle "d". Used sparingly: section dividers, hero backdrop,
 * button decoration. Never as generic decoration on every card.
 */
export function ArcMotif({ className = "", variant = "gold" }: ArcMotifProps) {
  const stroke =
    variant === "gold" ? "#DB9E41" : variant === "teal" ? "#254B56" : "currentColor";

  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M20 200 A140 140 0 0 1 200 20"
        stroke={stroke}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <circle cx="176" cy="176" r="34" fill={stroke} opacity="0.9" />
    </svg>
  );
}
