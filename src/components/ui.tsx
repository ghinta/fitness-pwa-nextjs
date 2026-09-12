import type { ReactNode } from "react";

export function Card({
  children,
  accent = false,
  className = "",
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border p-5 shadow-[0_16px_48px_rgba(10,33,27,0.07)] ${
        accent
          ? "border-emerald-300 bg-emerald-50/90"
          : "border-slate-200 bg-white"
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function Status({
  children,
  kind = "info",
}: {
  children: ReactNode;
  kind?: "info" | "success" | "error";
}) {
  const styles = {
    info: "border-sky-200 bg-sky-50 text-sky-950",
    success: "border-emerald-200 bg-emerald-50 text-emerald-950",
    error: "border-red-200 bg-red-50 text-red-950",
  };
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${styles[kind]}`}
    >
      {children}
    </p>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-800">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="text-xs font-normal leading-5 text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

export const buttonPrimary =
  "inline-flex min-h-12 items-center justify-center rounded-2xl bg-emerald-900 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-45";
export const buttonSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-45";
export const buttonDanger =
  "inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-4 py-2 font-semibold text-red-800 transition hover:bg-red-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:opacity-45";
export const inputClass =
  "min-h-12 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-500";
