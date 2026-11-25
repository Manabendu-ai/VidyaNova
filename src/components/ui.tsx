import { useEffect, useId, useRef, type ReactNode } from "react";
export const date = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function Head({
  title,
  subtitle,
  role = "Student workspace",
}: {
  title: string;
  subtitle: string;
  role?: string;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <span className="workspace">{role}</span>
    </header>
  );
}
export function Card({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      {title && <h2>{title}</h2>}
      {subtitle && <p>{subtitle}</p>}
      {children}
    </section>
  );
}
export function Stats({
  items,
}: {
  items: [string, string | number, string][];
}) {
  return (
    <div className="stats">
      {items.map(([label, value, foot]) => (
        <section className="card stat" key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{foot}</small>
        </section>
      ))}
    </div>
  );
}
export function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="table-wrap">
      {rows.length ? (
        <table>
          <thead>
            <tr>
              {headers.map((h) => (
                <th scope="col" key={h}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty">No records match this view.</p>
      )}
    </div>
  );
}
export function Badge({
  children,
  tone = "purple",
}: {
  children: ReactNode;
  tone?: "purple" | "green" | "orange";
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
export function Bars({
  rows,
}: {
  rows: { label: string; value: number; note?: string; end?: ReactNode }[];
}) {
  return (
    <div className="bars">
      {rows.map(({ label, value, note, end }, i) => (
        <div className="bar-row" key={label}>
          <div>
            <strong>{label}</strong>
            {note && <small>{note}</small>}
          </div>
          <progress
            className={"bar-" + (i % 4)}
            value={value}
            max={100}
            aria-label={label}
          />
          {end ?? <small>{value}%</small>}
        </div>
      ))}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog aria-labelledby={headingId} ref={ref} onCancel={close}>
      <div className="modal-head">
        <h2 id={headingId}>{title}</h2>
        <button
          type="button"
          className="secondary"
          onClick={close}
          aria-label="Close dialog"
        >
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
