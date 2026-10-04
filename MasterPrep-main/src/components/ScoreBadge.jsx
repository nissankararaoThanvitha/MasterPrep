/* Interview score with a word + icon, so the band never relies on color alone. */
function scoreBand(score) {
  if (score === null || score === undefined) return null;
  if (score >= 8) return { label: "Strong", icon: "✔", cls: "bg-green-50 text-green-800 border-green-300" };
  if (score >= 5) return { label: "Partial", icon: "◐", cls: "bg-amber-50 text-amber-900 border-amber-300" };
  return { label: "Needs work", icon: "✖", cls: "bg-red-50 text-red-800 border-red-300" };
}

export default function ScoreBadge({ score, size = "sm" }) {
  const band = scoreBand(score);
  if (!band) {
    return <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">Not answered</span>;
  }
  const big = size === "lg";
  return (
    <span
      className={`inline-flex items-center gap-1.5 border rounded-full font-semibold whitespace-nowrap shrink-0 ${band.cls} ${
        big ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <span aria-hidden="true">{band.icon}</span>
      {Number.isInteger(score) ? score : score.toFixed(1)}/10 · {band.label}
    </span>
  );
}
