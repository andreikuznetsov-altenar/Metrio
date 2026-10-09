import { Path, Svg } from '@react-pdf/renderer';

/** PDF-safe Altenar mark (vector paths only — no SVG text/fonts). */
export function AltenarPdfLogo({
  width = 108,
  height = 28,
}: {
  width?: number;
  height?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 108 28">
      <Path
        fill="#0B3D2E"
        d="M6 2h14.5c4.2 0 7.5 3.1 7.5 7.2 0 2.5-1.2 4.7-3.1 6.1L30 26H20.2L14.8 18.2H11.5V26H6V2zm5.5 5.2v5.6h5.8c1.6 0 2.9-1.2 2.9-2.8s-1.3-2.8-2.9-2.8h-5.8z"
      />
      <Path
        fill="#0B3D2E"
        d="M36 2h6.2l11.4 24H47l-2.2-4.8H37.4L35.2 26H29L36 2zm5.5 13.2L40.1 9.8 38.7 15.2h2.8z"
      />
      <Path
        fill="#0B3D2E"
        d="M58 2h6v9.4c0 2.2 1.7 4 3.9 4 2.1 0 3.8-1.8 3.8-4V2h6v9.6c0 5.4-4.4 9.8-9.8 9.8S58 17 58 11.6V2z"
      />
      <Path fill="#0B3D2E" d="M82 2h6v24h-6V2z" />
      <Path
        fill="#0B3D2E"
        d="M92 2h6.4c5.2 0 9.4 4.2 9.4 9.4S103.6 26 98.4 26H92V2zm6.2 5v14h.2c2.5 0 4.4-2 4.4-4.5S100.9 12 98.2 12h-.2V7z"
      />
    </Svg>
  );
}
