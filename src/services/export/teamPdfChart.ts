export interface PdfChartPoint {
  x: number;
  y: number;
}

function paddedDomain(values: number[]): { min: number; max: number } {
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;
  if (rawSpan === 0) {
    const pad = Math.max(Math.abs(rawMax) * 0.18, 1);
    return { min: rawMin - pad, max: rawMax + pad };
  }
  const pad = Math.max(rawSpan * 0.16, 1);
  return { min: rawMin - pad, max: rawMax + pad };
}

export function buildTrendChartGeometry(
  values: number[],
  width: number,
  height: number,
  padX = 10,
  padY = 10,
): {
  linePoints: PdfChartPoint[];
  areaPoints: PdfChartPoint[];
  baselineY: number;
} | null {
  if (values.length < 2) return null;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const { min, max } = paddedDomain(values);
  const span = max - min;
  const baselineY = height - padY;
  const linePoints = values.map((value, index) => ({
    x: padX + (index / (values.length - 1)) * innerW,
    y: padY + innerH - ((value - min) / span) * innerH,
  }));
  const areaPoints = [
    { x: linePoints[0].x, y: baselineY },
    ...linePoints,
    { x: linePoints[linePoints.length - 1].x, y: baselineY },
  ];
  return { linePoints, areaPoints, baselineY };
}

export function linePathFromPoints(points: PdfChartPoint[]): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return [`M ${first.x} ${first.y}`, ...rest.map((point) => `L ${point.x} ${point.y}`)].join(' ');
}

export function smoothPathFromPoints(points: PdfChartPoint[]): string {
  if (points.length < 2) return linePathFromPoints(points);
  const first = points[0];
  const parts = [`M ${first.x} ${first.y}`];
  points.slice(0, -1).forEach((point, index) => {
    const next = points[index + 1];
    const dx = (next.x - point.x) / 2;
    parts.push(
      `C ${point.x + dx} ${point.y} ${next.x - dx} ${next.y} ${next.x} ${next.y}`,
    );
  });
  return parts.join(' ');
}

export function areaPathFromPoints(points: PdfChartPoint[], baselineY: number): string {
  if (points.length === 0) return '';
  const first = points[0];
  const last = points[points.length - 1];
  const line = points.map((point) => `L ${point.x} ${point.y}`).join(' ');
  return `M ${first.x} ${baselineY} ${line} L ${last.x} ${baselineY} Z`;
}
