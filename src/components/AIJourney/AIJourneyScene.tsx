import React from "react";

const EDGES: Array<[number, number, number, number]> = [
  [530, 140, 650, 125],
  [530, 140, 650, 180],
  [530, 140, 650, 235],
  [530, 200, 650, 125],
  [530, 200, 650, 180],
  [530, 200, 650, 235],
  [530, 260, 650, 125],
  [530, 260, 650, 180],
  [530, 260, 650, 235],
  [650, 125, 770, 155],
  [650, 125, 770, 225],
  [650, 180, 770, 155],
  [650, 180, 770, 225],
  [650, 235, 770, 155],
  [650, 235, 770, 225],
  [770, 155, 870, 190],
  [770, 225, 870, 190],
];

// Edges that carry a travelling signal, with the delay class that staggers them.
const SIGNALS: Array<[number, number, number, number, string]> = [
  [530, 140, 650, 180, ""],
  [530, 260, 650, 125, "aij-s2"],
  [530, 200, 650, 235, "aij-s3"],
  [650, 125, 770, 225, "aij-s2"],
  [650, 180, 770, 155, "aij-s4"],
  [650, 235, 770, 155, "aij-s3"],
  [770, 155, 870, 190, "aij-s4"],
  [770, 225, 870, 190, ""],
];

const NODES: Array<[number, number, number, string]> = [
  [530, 140, 10, ""],
  [530, 200, 10, ""],
  [530, 260, 10, ""],
  [650, 125, 10, "aij-l2"],
  [650, 180, 10, "aij-l2"],
  [650, 235, 10, "aij-l2"],
  [770, 155, 10, "aij-l3"],
  [770, 225, 10, "aij-l3"],
  [870, 190, 14, "aij-l4"],
];

/**
 * Decorative robot and neural network. The meaning lives in the section's text,
 * so the drawing is hidden from assistive technology. Colours come from the
 * theme variables in ai-journey.css, so it follows light and dark mode.
 */
const AIJourneyScene: React.FC = () => (
  <svg
    className="aij-scene"
    viewBox="0 0 900 320"
    width="100%"
    aria-hidden="true"
    focusable="false"
  >
    <ellipse className="aij-shadow" cx="140" cy="292" rx="62" ry="9" />
    <g className="aij-float">
      <g transform="translate(60 30)">
        <line className="aij-stroke" x1="80" y1="34" x2="80" y2="12" strokeWidth="4" />
        <circle className="aij-beacon" cx="80" cy="9" r="16" />
        <circle className="aij-accent" cx="80" cy="9" r="7" />
        <rect className="aij-limb" x="8" y="64" width="14" height="30" rx="6" />
        <rect className="aij-limb" x="138" y="64" width="14" height="30" rx="6" />
        <rect className="aij-metal" x="18" y="32" width="124" height="94" rx="28" />
        <rect className="aij-screen" x="32" y="50" width="96" height="54" rx="18" />
        <ellipse className="aij-eye aij-accent" cx="62" cy="74" rx="9" ry="11" />
        <ellipse className="aij-eye aij-accent" cx="98" cy="74" rx="9" ry="11" />
        <path className="aij-stroke" d="M68 92 Q80 100 92 92" fill="none" strokeWidth="3" />
        <rect className="aij-limb" x="66" y="126" width="28" height="10" rx="3" />
        <rect className="aij-limb" x="6" y="146" width="20" height="66" rx="10" />
        <circle className="aij-hand" cx="16" cy="216" r="11" />
        <rect className="aij-metal" x="28" y="136" width="104" height="100" rx="24" />
        <rect className="aij-screen" x="48" y="154" width="64" height="44" rx="10" />
        <g>
          {[56, 66, 76, 86, 96].map((x) => (
            <rect key={x} className="aij-bar" x={x} y="164" width="6" height="26" rx="3" />
          ))}
        </g>
        <circle className="aij-dot-a" cx="60" cy="216" r="5" />
        <circle className="aij-dot-b" cx="80" cy="216" r="5" />
        <circle className="aij-dot-c" cx="100" cy="216" r="5" />
      </g>
      <g className="aij-wave">
        <rect className="aij-limb" x="183" y="182" width="20" height="66" rx="10" />
        <circle className="aij-hand" cx="193" cy="252" r="11" />
      </g>
    </g>

    <g className="aij-bubble" transform="translate(250 56)">
      <rect className="aij-bubble-box" width="226" height="48" rx="16" />
      <text className="aij-code" x="18" y="30">
        print(&quot;Hello, AI&quot;)
      </text>
    </g>
    <g className="aij-bubble" transform="translate(250 118)">
      <rect className="aij-bubble-box" width="150" height="34" rx="12" />
      <text className="aij-muted" x="16" y="22">
        learning
      </text>
      <circle className="aij-typing" cx="92" cy="17" r="3.5" />
      <circle className="aij-typing aij-d2" cx="104" cy="17" r="3.5" />
      <circle className="aij-typing aij-d3" cx="116" cy="17" r="3.5" />
    </g>

    <g className="aij-edges">
      {EDGES.map(([x1, y1, x2, y2]) => (
        <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </g>
    <g className="aij-signals">
      {SIGNALS.map(([x1, y1, x2, y2, delay]) => (
        <line
          key={`${x1}-${y1}-${x2}-${y2}`}
          className={`aij-signal ${delay}`}
          pathLength={100}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
        />
      ))}
    </g>
    <g className="aij-nodes">
      {NODES.map(([cx, cy, r, layer]) => (
        <circle key={`${cx}-${cy}`} className={`aij-node ${layer}`} cx={cx} cy={cy} r={r} />
      ))}
    </g>
  </svg>
);

export default AIJourneyScene;
