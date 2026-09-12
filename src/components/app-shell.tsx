"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

import { BASE_PATH } from "@/lib/constants";
import { useApp } from "./app-provider";
import { buttonPrimary, Status } from "./ui";

const navigation = [
  { href: "/", label: "Start", icon: "●" },
  { href: "/history", label: "Verlauf", icon: "↗" },
  { href: "/settings", label: "Einstellungen", icon: "≡" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { allowNavigation } = useApp();
  const training = pathname.endsWith("/training");

  const guard = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!allowNavigation()) event.preventDefault();
  };

  return (
    <>
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-50 -translate-y-24 rounded-xl bg-white px-4 py-3 font-bold text-emerald-950 shadow-lg focus:translate-y-0"
      >
        Zum Inhalt springen
      </a>
      <header className="border-b border-white/10 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link
            href="/"
            onClick={guard}
            className="text-lg font-black tracking-tight"
          >
            Fitness <span className="text-emerald-300">PWA</span>
          </Link>
          <span className="rounded-full border border-emerald-700 bg-emerald-900 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-100">
            Lokal & offline
          </span>
        </div>
      </header>
      <PwaUpdateNotice />
      <main
        id="main-content"
        tabIndex={-1}
        className={`mx-auto w-full max-w-3xl flex-1 px-4 py-7 sm:px-6 ${training ? "pb-8" : "pb-28"}`}
      >
        {children}
      </main>
      {!training ? (
        <nav
          aria-label="Hauptnavigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur"
        >
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-1 px-3 pt-2">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" ||
                    pathname === BASE_PATH ||
                    pathname === `${BASE_PATH}/`
                  : pathname.endsWith(item.href) ||
                    pathname.endsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={guard}
                  aria-current={active ? "page" : undefined}
                  className={`grid min-h-14 place-items-center rounded-2xl px-2 py-1 text-xs font-bold transition ${
                    active
                      ? "bg-emerald-50 text-emerald-950"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span aria-hidden className="text-lg leading-none">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </>
  );
}

function PwaUpdateNotice() {
  const { activeWorkout, hasUnsavedChanges, timerRunning } = useApp();
  const [waiting, setWaiting] = useState<ServiceWorker>();
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    )
      return;
    let registration: ServiceWorkerRegistration | undefined;
    const inspect = () => setWaiting(registration?.waiting ?? undefined);
    const register = async () => {
      registration = await navigator.serviceWorker.register(
        `${BASE_PATH}/sw.js`,
        { scope: `${BASE_PATH}/`, updateViaCache: "none" },
      );
      inspect();
      registration.addEventListener("updatefound", () => {
        registration?.installing?.addEventListener("statechange", inspect);
      });
    };
    void register();
    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload);
    return () =>
      navigator.serviceWorker.removeEventListener("controllerchange", reload);
  }, []);

  if (!waiting) return null;
  const blocked = Boolean(activeWorkout) || hasUnsavedChanges || timerRunning;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Status>
          {blocked
            ? "Update bereit. Es wird nach dem Training angeboten."
            : "Eine neue Version ist bereit."}
        </Status>
        {!blocked ? (
          <button
            type="button"
            className={buttonPrimary}
            disabled={applying}
            onClick={() => {
              setApplying(true);
              waiting.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            {applying ? "Wird aktualisiert …" : "Jetzt aktualisieren"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
