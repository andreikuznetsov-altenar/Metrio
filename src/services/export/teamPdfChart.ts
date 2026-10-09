export interface PdfChartPoint {
  x: number;
  y: number;
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
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
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

export function polylineFromPoints(points: PdfChartPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(' ');
}
