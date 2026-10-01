export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const height = 20;
  const baseline = 22;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      let y: number;
      if (range === 0) {
        y = baseline - height / 2;
      } else {
        y = baseline - ((value - min) / range) * height - 1;
      }
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      className="performance-sparkline"
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
