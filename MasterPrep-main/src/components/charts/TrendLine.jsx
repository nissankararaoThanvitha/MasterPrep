import { useEffect, useRef, useState } from "react";

const H = 220;
const PAD = { l: 44, r: 44, t: 16, b: 30 };
const Y_TICKS = [0, 25, 50, 75, 100];

/* Single-series line (0-100%) over evenly spaced points.
   points: [{ label, value (null = no data), tooltip }]
   Gaps in the data break the line instead of drawing through them. */
export default function TrendLine({ points }) {
  const [hover, setHover] = useState(null);

  /* Draw at the container's real width (instead of scaling a fixed-size
     drawing), so labels stay 11px on a phone instead of shrinking. */
  const boxRef = useRef(null);
  const [W, setW] = useState(640);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setW(Math.max(280, Math.round(entry.contentRect.width)))
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // On narrow screens label every other week so the dates don't collide
  const labelEvery = W < 480 ? 2 : 1;

  const n = points.length;
  const step = (W - PAD.l - PAD.r) / Math.max(n - 1, 1);
  const x = (i) => PAD.l + i * step;
  const y = (v) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);

  // consecutive runs of points that have data
  const runs = [];
  points.forEach((p, i) => {
    if (p.value === null) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === i - 1) last.push(i);
    else runs.push([i]);
  });

  const lastIdx = [...points.keys()].reverse().find((i) => points[i].value !== null);
  const hovered = hover !== null ? points[hover] : null;

  return (
    <div ref={boxRef} className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
           aria-label="Weekly quiz accuracy">
        {/* recessive hairline grid + y labels */}
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)}
                  stroke={t === 0 ? "#c3c2b7" : "#e1e0d9"} strokeWidth="1" />
            <text x={PAD.l - 8} y={y(t)} dy="0.32em" textAnchor="end"
                  fontSize="11" fill="#898781">{t}%</text>
          </g>
        ))}

        {/* x labels */}
        {points.map((p, i) => (
          (n - 1 - i) % labelEvery === 0 && (
            <text key={p.label} x={x(i)} y={H - 8} textAnchor="middle"
                  fontSize="11" fill="#898781">{p.label}</text>
          )
        ))}

        {/* crosshair */}
        {hovered && (
          <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b}
                stroke="#c3c2b7" strokeWidth="1" />
        )}

        {/* line segments */}
        {runs.filter((r) => r.length > 1).map((r) => (
          <polyline key={r[0]} fill="none" stroke="#4f46e5" strokeWidth="2"
                    strokeLinejoin="round" strokeLinecap="round"
                    points={r.map((i) => `${x(i)},${y(points[i].value)}`).join(" ")} />
        ))}

        {/* markers with a 2px surface ring */}
        {points.map((p, i) => p.value !== null && (
          <circle key={i} cx={x(i)} cy={y(p.value)} r={hover === i ? 6 : 4.5}
                  fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
        ))}

        {/* direct label on the latest point only */}
        {lastIdx !== undefined && (
          <text x={x(lastIdx) + 10} y={y(points[lastIdx].value)} dy="0.32em"
                fontSize="12" fontWeight="600" fill="#0b0b0b">
            {Math.round(points[lastIdx].value)}%
          </text>
        )}

        {/* hover targets: one full-height column per point */}
        {points.map((p, i) => (
          <rect key={i} x={x(i) - step / 2} y={0} width={step} height={H}
                fill="transparent" tabIndex={0}
                onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}>
            <title>{p.tooltip}</title>
          </rect>
        ))}
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0b0b0b] text-white text-xs px-2 py-1 shadow"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 0 }}
        >
          {hovered.tooltip}
        </div>
      )}
    </div>
  );
}
