import type { ReactNode } from "react";

export function PageHead({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="compact:pt-7 pt-10 pb-8">
      <h1 className="font-display compact:text-4xl text-5xl leading-tight font-semibold tracking-tight">
        {title}
        <span className="text-app">.</span>
      </h1>
      <p className="text-muted mt-3 max-w-2xl text-sm leading-6">{children}</p>
    </section>
  );
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="border-line bg-canvas text-app mt-2 overflow-x-auto border px-3 py-2 font-mono text-[11px] leading-5">
      <code>{children}</code>
    </pre>
  );
}

export function Section({
  id,
  title,
  children,
  lead,
}: {
  id: string;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="border-line-soft scroll-mt-20 border-t py-10 first:border-t-0 first:pt-0"
    >
      <h2
        id={`${id}-h`}
        className="font-display text-2xl font-semibold tracking-tight"
      >
        {title}
      </h2>
      {lead && (
        <p className="text-muted mt-2 max-w-2xl text-xs leading-5">{lead}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function FileLink({
  href,
  title,
  note,
}: {
  href: string;
  title: string;
  note: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="hover:bg-card grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 px-4 py-3 transition-colors"
    >
      <span className="text-app text-[12px] font-medium">{title}</span>
      <span className="text-dim text-[11px]">↗</span>
      <span className="text-muted col-span-2 text-[11px] leading-5">
        {note}
      </span>
    </a>
  );
}
