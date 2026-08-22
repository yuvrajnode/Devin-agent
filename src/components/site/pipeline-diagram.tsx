/**
 * The request path, drawn rather than typed.
 *
 * An earlier version used box-drawing characters in a <pre>; IBM Plex Mono has
 * no glyphs for several of them, so they rendered as tofu. SVG also lets the
 * two crossing arrows carry the accent colour, which is the thing worth
 * noticing in the diagram.
 */

const NODE = {
  fill: "var(--surface-raised)",
  stroke: "var(--line-strong)",
} as const;

function Node({
  x,
  y,
  w,
  h,
  title,
  sub,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  sub?: string;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={NODE.fill} stroke={NODE.stroke} />
      <text
        x={x + 12}
        y={sub ? y + 22 : y + h / 2 + 4}
        fill="var(--content-primary)"
        fontSize="12"
      >
        {title}
      </text>
      {sub ? (
        <text x={x + 12} y={y + 38} fill="var(--content-muted)" fontSize="10.5">
          {sub}
        </text>
      ) : null}
    </g>
  );
}

export function PipelineDiagram() {
  return (
    <svg
      viewBox="0 0 600 340"
      className="h-auto w-full font-mono"
      role="img"
      aria-label="Request path: the composer posts an objective to the server, which validates and rate limits it, plans it with the heuristic or model planner, and streams engine events back to the browser, where a reducer folds them into a session."
    >
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
        </marker>
      </defs>

      {/* Lanes */}
      <line
        x1="300"
        y1="10"
        x2="300"
        y2="330"
        stroke="var(--line-hair)"
        strokeDasharray="3 4"
      />
      <text x={14} y={14} fill="var(--content-muted)" fontSize="10" letterSpacing="1.5">
        BROWSER
      </text>
      <text x={316} y={14} fill="var(--content-muted)" fontSize="10" letterSpacing="1.5">
        SERVER
      </text>

      <Node x={14} y={34} w={232} h={44} title="Composer" />
      <Node x={14} y={190} w={232} h={44} title="Stream reader" />
      <Node x={14} y={266} w={232} h={52} title="reduce()" sub="Session · plan · diff · chat" />

      <Node x={354} y={34} w={232} h={44} title="Validate · rate limit" />
      <Node x={354} y={110} w={232} h={52} title="Planner" sub="heuristic · model" />
      <Node x={354} y={190} w={232} h={52} title="Engine" sub="async generator" />

      {/* Request crossing to the server */}
      <g className="text-accent" stroke="currentColor">
        <line x1="246" y1="56" x2="348" y2="56" markerEnd="url(#arrow)" />
      </g>
      <text x={297} y={28} fill="var(--accent)" fontSize="10" textAnchor="middle">
        POST /api/run
      </text>

      {/* Server-side descent */}
      <g stroke="var(--line-strong)">
        <line x1="470" y1="78" x2="470" y2="106" markerEnd="url(#arrow)" color="var(--content-muted)" />
        <line x1="470" y1="162" x2="470" y2="186" markerEnd="url(#arrow)" color="var(--content-muted)" />
      </g>

      {/* Events crossing back to the browser */}
      <g className="text-accent" stroke="currentColor">
        <line x1="348" y1="212" x2="250" y2="212" markerEnd="url(#arrow)" />
      </g>
      <text x={299} y={204} fill="var(--accent)" fontSize="10" textAnchor="middle">
        text/event-stream
      </text>

      {/* Reduce */}
      <g stroke="var(--line-strong)">
        <line x1="130" y1="234" x2="130" y2="262" markerEnd="url(#arrow)" color="var(--content-muted)" />
      </g>
    </svg>
  );
}
