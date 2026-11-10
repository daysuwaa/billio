/** The hero's dotted network: each subscription is a node, the next one to be charged glows. */
const SPOTS: [number, number][] = [
  [292, 70], [318, 150], [296, 222], [236, 282], [120, 296], [52, 268], [214, 34], [318, 296],
]

export function Network({ names }: { names: string[] }) {
  const nodes = names.slice(0, SPOTS.length).map((n, i) => ({ n, x: SPOTS[i][0], y: SPOTS[i][1] }))
  const lines: [number, number][] = nodes.map((_, i) => [i, (i + 1) % nodes.length] as [number, number]).filter(([a, b]) => a !== b)
  return (
    <svg className="net" viewBox="0 0 360 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {lines.map(([a, b], i) => (
        <path key={i} className="link" d={`M${nodes[a].x} ${nodes[a].y} Q ${(nodes[a].x + nodes[b].x) / 2 + (i % 2 ? 24 : -24)} ${(nodes[a].y + nodes[b].y) / 2} ${nodes[b].x} ${nodes[b].y}`} />
      ))}
      {nodes.map((p, i) => (
        <g key={p.n + i}>
          {i === 0 ? <circle className="ring" cx={p.x} cy={p.y} r="6" /> : null}
          <circle className={'dot' + (i === 0 ? ' first' : '')} cx={p.x} cy={p.y} r={i === 0 ? 5 : 3.5} />
          <text x={p.x} y={p.y + 18} textAnchor="middle">{p.n.length > 12 ? p.n.slice(0, 11) + '…' : p.n}</text>
        </g>
      ))}
    </svg>
  )
}
