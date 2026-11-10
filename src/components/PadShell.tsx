import type { HTMLAttributes, ReactNode } from "react";

const screws = [
  "top-2.5 left-2.5",
  "top-2.5 right-2.5",
  "bottom-2.5 left-2.5",
  "right-2.5 bottom-2.5",
];

/** The simulated BLOOPPAD-MAXX body: a dark object in both color schemes. */
export function PadShell({
  className = "",
  label = true,
  power = false,
  children,
}: {
  className?: string;
  /** Corner screws and the printed BLOOPPAD MAXX caption. */
  label?: boolean;
  /** Power LED beside the caption. */
  power?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`border-pad bg-pad-shell relative border ${className}`}>
      {label &&
        screws.map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`bg-pad-bed border-pad absolute size-1 border ${pos}`}
          />
        ))}
      {children}
      {label && (
        <div className="font-display text-pad-text mt-3 text-center text-[10px] tracking-[0.28em]">
          BLOOPPAD <b className="ml-1 tracking-wide">MAXX</b>
          {power && (
            <span
              aria-hidden="true"
              className="bg-pad-text absolute right-6 mt-1 size-1"
            />
          )}
        </div>
      )}
    </div>
  );
}

/** The recessed 8-column bed that holds the pixel buttons. */
export function PadBed({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-pad-bed grid grid-cols-8 border border-black ${className}`}
      {...rest}
    />
  );
}
