"use client";

interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
}

export function SparklineChart({ data, width = 80, height = 32 }: SparklineChartProps) {
  if (!data || data.length < 2) {
    return <div style={{ width, height }} className="bg-zinc-800/40 rounded" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * w;
    const y = pad + (1 - (v - min) / range) * h;
    return `${x},${y}`;
  });

  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? "#2dd4bf" : "#ef4444"; // teal-400 / red-500

  // build area fill path
  const lineD = `M ${points.join(" L ")}`;
  const areaD = `${lineD} L ${pad + w},${pad + h} L ${pad},${pad + h} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* area fill */}
      <path d={areaD} fill={color} fillOpacity={0.08} />
      {/* line */}
      <path
        d={lineD}
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* end dot */}
      <circle
        cx={pad + w}
        cy={pad + (1 - (data[data.length - 1] - min) / range) * h}
        r={2}
        fill={color}
      />
    </svg>
  );
}