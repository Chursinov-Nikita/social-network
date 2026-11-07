const ARCS = [
  "M 98,212 A 30,30 0 0,1 158,212",
  "M 68,204 A 60,60 0 0,1 188,204",
  "M 38,196 A 90,90 0 0,1 218,196",
];

const NeblMark = ({ className }: { className?: string }) => (
  <svg viewBox="28 100 200 146" aria-hidden="true" className={className}>
    {ARCS.map((d) => (
      <path
        key={d}
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="square"
      />
    ))}
    <rect x="120" y="227" width="16" height="16" fill="currentColor" />
  </svg>
);

export default NeblMark;
