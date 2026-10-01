export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return null;
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 24 - (value / max) * 20 - 2;
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
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
