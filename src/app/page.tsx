"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { useApp } from "@/components/app-provider";
import { buttonDanger, buttonPrimary, Card, Status } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { ActiveWorkout, TemplatePlan } from "@/services/fitness-service";

interface StartData {
  active?: ActiveWorkout;
  plans: TemplatePlan[];
}

export default function HomePage() {
  const { fitness, ready, error, revision, refresh } = useApp();
  const router = useRouter();
  const [data, setData] = useState<StartData>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState<string>();

  useEffect(() => {
    if (!fitness) return;
    let cancelled = false;
    void (async () => {
      const active = await fitness.getActiveWorkout();
      const plans = active ? [] : await fitness.listPlans();
      if (!cancelled) setData({ active, plans });
    })();
    return () => {
      cancelled = true;
    };
  }, [fitness, revision]);

  const start = async (plan: TemplatePlan) => {
    if (!fitness) return;
    setBusy(plan.template.id);
    setMessage(undefined);
    try {
      await fitness.startWorkout(plan.template.id);
      await refresh();
      router.push("/training");
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : "Start fehlgeschlagen.",
      );
      setBusy(undefined);
    }
  };

  if (error) {
    return (
      <PageIntro title="Lokaler Speicher nicht verfügbar">
        <Status kind="error">{error} Es wurden keine Daten gelöscht.</Status>
      </PageIntro>
    );
  }
  if (!ready || !data) return <Loading />;

  const active = data.active;
  return (
    <div className="grid gap-6">
      <PageIntro title="Bereit fürs Training">
        <p className="max-w-xl text-base leading-7 text-slate-600">
          Wähle deinen Plan. Die konkrete Übung entscheidest du direkt vor dem
          jeweiligen Satz.
        </p>
      </PageIntro>

      {message ? <Status kind="error">{message}</Status> : null}

      {active ? (
        <ActiveWorkoutCard
          workout={active}
          busy={busy === active.session.id}
          onResume={() => router.push("/training")}
          onDiscard={async () => {
            if (!fitness) return;
            if (
              !window.confirm(
                "Aktives Training und alle bereits erfassten Sätze wirklich verwerfen?",
              )
            )
              return;
            setBusy(active.session.id);
            try {
              await fitness.discardWorkout(active.session.id);
              await refresh();
            } catch (caught) {
              setMessage(
                caught instanceof Error
                  ? caught.message
                  : "Verwerfen fehlgeschlagen.",
              );
            } finally {
              setBusy(undefined);
            }
          }}
        />
      ) : data.plans.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.plans.map((plan) => (
            <PlanCard
              key={plan.template.id}
              plan={plan}
              busy={busy === plan.template.id}
              onStart={() => void start(plan)}
            />
          ))}
        </div>
      ) : (
        <Status>
          Kein aktiver Trainingsplan vorhanden. Aktiviere einen Plan in den
          Einstellungen.
        </Status>
      )}

      <aside className="grid grid-cols-3 gap-3 rounded-3xl bg-emerald-950 p-4 text-center text-emerald-50">
        <Metric value="6" label="Übungen" />
        <Metric value="1" label="Arbeitssatz" />
        <Metric value="60–90" label="Sekunden" />
      </aside>
    </div>
  );
}

function PageIntro({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="grid gap-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        HIT Trainingslog
      </p>
      <h1 className="text-4xl font-black tracking-[-0.04em] text-emerald-950 sm:text-5xl">
        {title}
      </h1>
      {children}
    </header>
  );
}

function PlanCard({
  plan,
  busy,
  onStart,
}: {
  plan: TemplatePlan;
  busy: boolean;
  onStart(): void;
}) {
  const slots = plan.slots.filter(({ slot }) => slot.active);
  return (
    <Card className="flex h-full flex-col gap-5">
      <div>
        <p className="mb-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
          Trainingsplan
        </p>
        <h2 className="text-2xl font-black text-slate-950">
          {plan.template.name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Optionales Aufwärmen, danach ein intensiver Arbeitssatz.
        </p>
      </div>
      <ol className="grid flex-1 gap-3">
        {slots.map(({ slot, exercises }, index) => {
          const primary = exercises.find(
            (exercise) => exercise.id === slot.primaryExerciseId,
          );
          return (
            <li key={slot.id} className="flex gap-3 text-sm">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 font-black text-emerald-900">
                {index + 1}
              </span>
              <span className="grid">
                <strong>{slot.label}</strong>
                <span className="text-slate-500">
                  {primary?.name ?? "Nicht verfügbar"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={buttonPrimary}
        disabled={busy}
        onClick={onStart}
      >
        {busy ? "Wird gestartet …" : `${plan.template.name} starten`}
      </button>
    </Card>
  );
}

function ActiveWorkoutCard({
  workout,
  busy,
  onResume,
  onDiscard,
}: {
  workout: ActiveWorkout;
  busy: boolean;
  onResume(): void;
  onDiscard(): Promise<void>;
}) {
  const completed = new Set(
    workout.results
      .filter((result) => result.setType === "working")
      .map((result) => result.exerciseSlotId),
  ).size;
  const total = workout.plan.slots.filter(({ slot }) => slot.active).length;
  return (
    <Card accent className="grid gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            Aktives Training
          </p>
          <h2 className="mt-1 text-2xl font-black text-emerald-950">
            {workout.session.templateNameSnapshot}
          </h2>
          <p className="mt-2 text-sm leading-6 text-emerald-900/75">
            Begonnen {formatDate(workout.session.startedAt)}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-emerald-900 shadow-sm">
          {completed}/{total}
        </span>
      </div>
      <progress
        max={total}
        value={completed}
        aria-label="Trainingsfortschritt"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" className={buttonPrimary} onClick={onResume}>
          Training fortsetzen
        </button>
        <button
          type="button"
          className={buttonDanger}
          disabled={busy}
          onClick={() => void onDiscard()}
        >
          Training verwerfen
        </button>
      </div>
    </Card>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong className="block text-xl font-black text-emerald-300">
        {value}
      </strong>
      <span className="text-xs text-emerald-100/75">{label}</span>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid min-h-64 place-items-center" role="status">
      <p className="animate-pulse font-bold text-emerald-800">
        App wird vorbereitet …
      </p>
    </div>
  );
}
