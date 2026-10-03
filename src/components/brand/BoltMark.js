// Himmat bolt mark (approved brand sheet). Paths are in a 512×512 box.
export const BOLT_PATH = "M282 52 L142 286 H244 L204 460 L374 214 H276 L326 52 Z";
export const BOLT_PATH_SMALL = "M290 40 L130 292 H246 L198 472 L386 208 H272 L330 40 Z";

const NAVY = "#0E1A2B";
const AMBER = "#F2A20C";

export default function BoltMark({ size = 40, tone = "navy", title, className }) {
  const [tile, bolt] = tone === "amber" ? [AMBER, NAVY] : [NAVY, AMBER];
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": "true" };
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} {...a11y}>
      <rect width="512" height="512" rx="104" fill={tile} />
      <path d={size <= 32 ? BOLT_PATH_SMALL : BOLT_PATH} fill={bolt} />
    </svg>
  );
}
