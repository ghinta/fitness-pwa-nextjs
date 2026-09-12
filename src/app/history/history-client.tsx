"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useApp } from "@/components/app-provider";
import { Card, Status } from "@/components/ui";
import type { ExerciseResult } from "@/domain";
import { formatDate, formatWeight } from "@/lib/format";
import type { HistorySession } from "@/services/fitness-service";

export function HistoryClient() {
  const { fitness, ready, error, revision } = useApp();
  const search = useSearchParams();
  const [history, setHistory] = useState<HistorySession[]>();
  const exerciseId = search.get("exercise");
  const sessionId = search.get("session");

  useEffect(() => {
    if (!fitness) return;
    let cancelled = false;
    void fitness.listHistory().then((entries) => {
      if (!cancelled) setHistory(entries);
    });
    return () => {
      cancelled = true;
    };
  }, [fitness, revision]);

  if (error) return <Status kind="error">{error}</Status>;
  if (!ready || !history) return <p role="status">Verlauf wird geladen …</p>;
  if (exerciseId)
    return (
      <ExerciseHistory exerciseId={exerciseId} fallbackHistory={history} />
    );
  if (sessionId)
    return (
      <SessionDetail
        entry={history.find((entry) => entry.session.id === sessionId)}
      />
    );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Deine Entwicklung"
        title="Verlauf"
        text="Abgeschlossene Trainings, neueste zuerst."
      />
      {history.length === 0 ? (
        <Card>
          <p className="text-slate-600">Noch kein Training abgeschlossen.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {history.map((entry) => {
            const count = entry.results.filter(
              (result) => result.setType === "working",
            ).length;
            return (
              <Link
                key={entry.session.id}
                href={`/history?session=${encodeURIComponent(entry.session.id)}`}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_48px_rgba(10,33,27,0.06)] transition hover:-translate-y-0.5 hover:border-emerald-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-950 group-hover:text-emerald-900">
                      {entry.session.templateNameSnapshot}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatDate(
                        entry.session.completedAt ?? entry.session.startedAt,
                      )}
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
                    {count} Sätze
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SessionDetail({ entry }: { entry?: HistorySession }) {
  if (!entry) {
    return (
      <div className="grid gap-5">
        <BackLink>← Alle Trainings</BackLink>
        <h1 className="text-3xl font-black">Training nicht gefunden</h1>
      </div>
    );
  }
  const grouped = new Map<string, ExerciseResult[]>();
  for (const result of entry.results) {
    const values = grouped.get(result.exerciseSlotId) ?? [];
    values.push(result);
    grouped.set(result.exerciseSlotId, values);
  }
  return (
    <div className="grid gap-5">
      <BackLink>← Alle Trainings</BackLink>
      <PageHeader
        eyebrow="Abgeschlossen"
        title={entry.session.templateNameSnapshot}
        text={formatDate(entry.session.completedAt ?? entry.session.startedAt)}
      />
      {[...grouped.values()].map((results) => {
        const working = results.find((result) => result.setType === "working");
        if (!working) return null;
        const warmup = results.find((result) => result.setType === "warmup");
        return (
          <Card key={working.exerciseSlotId} className="grid gap-2">
            <Link
              href={`/history?exercise=${encodeURIComponent(working.exerciseId)}`}
              className="text-xl font-black text-emerald-950 underline decoration-emerald-300 underline-offset-4"
            >
              {working.exerciseNameSnapshot}
            </Link>
            {warmup ? (
              <p className="text-sm text-slate-500">
                Aufwärmen: {formatWeight(warmup.weightKg)} ·{" "}
                {warmup.durationSeconds} s
              </p>
            ) : null}
            <p className="font-bold text-slate-900">
              Arbeit: {formatWeight(working.weightKg)} ·{" "}
              {working.durationSeconds} s
            </p>
            {working.notes ? (
              <p className="border-l-3 border-emerald-300 pl-3 text-sm italic text-slate-600">
                {working.notes}
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

function ExerciseHistory({
  exerciseId,
  fallbackHistory,
}: {
  exerciseId: string;
  fallbackHistory: HistorySession[];
}) {
  const { fitness } = useApp();
  const [results, setResults] = useState<ExerciseResult[]>();

  useEffect(() => {
    let cancelled = false;
    void fitness?.previousWorkingResults(exerciseId).then((values) => {
      if (!cancelled) setResults(values);
    });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, fitness, fallbackHistory]);

  if (!results) return <p role="status">Übungsverlauf wird geladen …</p>;
  return (
    <div className="grid gap-5">
      <BackLink>← Verlauf</BackLink>
      <PageHeader
        eyebrow="Übungsentwicklung"
        title={results[0]?.exerciseNameSnapshot ?? "Übungsverlauf"}
      />
      {results.length === 0 ? (
        <Status>Keine Arbeitssätze für diese Übung gefunden.</Status>
      ) : (
        <Card>
          <ol className="divide-y divide-slate-100">
            {results.map((result) => (
              <li
                key={result.id}
                className="grid gap-1 py-4 first:pt-0 last:pb-0"
              >
                <strong className="text-lg text-slate-950">
                  {formatWeight(result.weightKg)} · {result.durationSeconds} s
                </strong>
                <span className="text-sm text-slate-500">
                  {formatDate(result.createdAt)}
                </span>
                {result.notes ? (
                  <span className="text-sm italic text-slate-600">
                    {result.notes}
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}

function BackLink({ children }: { children: React.ReactNode }) {
  return (
    <Link href="/history" className="w-fit font-bold text-emerald-800">
      {children}
    </Link>
  );
}

function PageHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <header className="grid gap-2">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
        {eyebrow}
      </p>
      <h1 className="text-4xl font-black tracking-[-0.04em] text-emerald-950">
        {title}
      </h1>
      {text ? <p className="text-slate-600">{text}</p> : null}
    </header>
  );
}
