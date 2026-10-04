import { useState } from "react";

const asPercent = (v) => `${Math.round(v)}%`;

/* Horizontal bars, one per subject (0-100).
   With `highlight`, this is an emphasis chart: that subject wears the
   accent and the rest are de-emphasis gray. Without it, all bars are the
   accent. Every bar carries its value as text, so color is never the only
   way to read it. */
export default function SubjectBars({ rows, highlight, emptyText = "No data yet", format = asPercent }) {
  const [hover, setHover] = useState(null);

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const isHighlight = r.subject === highlight;
        return (
          <div key={r.subject} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 text-sm">
            <div className="w-12 shrink-0 font-medium text-[#0b0b0b]">{r.subject}</div>

            <div className="relative flex-1 h-6 flex items-center">
              {r.value === null ? (
                <span className="text-[#898781] text-xs">{emptyText}</span>
              ) : (
                <>
                  {/* bar: square at the baseline, 4px rounded data-end */}
                  <div
                    className="h-4 rounded-r-[4px] cursor-default"
                    style={{
                      width: `calc(${r.value}% * 0.85)`,
                      minWidth: r.value > 0 ? 2 : 0, // tiny values stay visible; 0 draws nothing
                      background: !highlight || isHighlight ? "#4f46e5" : "#c3c2b7",
                    }}
                    onMouseEnter={() => setHover(r.subject)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <span className="ml-2 text-[#52514e] tabular-nums">
                    {format(r.value)}
                  </span>

                  {hover === r.subject && r.tooltip && (
                    <div className="absolute left-0 -top-9 z-10 whitespace-nowrap rounded-md bg-[#0b0b0b] text-white text-xs px-2 py-1 shadow">
                      {r.tooltip}
                    </div>
                  )}
                </>
              )}
            </div>

            {r.note && (
              // phones: its own line under the bar; wider screens: right column
              <div className="w-full sm:w-28 shrink-0 pl-[60px] sm:pl-0 sm:text-right text-xs text-[#898781]">
                {r.note}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
