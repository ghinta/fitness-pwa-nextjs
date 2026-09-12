"use client";
/* eslint-disable @next/next/no-img-element -- exercise images are local IndexedDB data URLs */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useApp } from "@/components/app-provider";
import {
  buttonPrimary,
  buttonSecondary,
  Card,
  Field,
  inputClass,
  Status,
} from "@/components/ui";
import {
  recommendNextWeight,
  type Exercise,
  type ExerciseResult,
  type ExerciseSlot,
  type SetType,
} from "@/domain";
import { errorMessage, formatDate, formatWeight } from "@/lib/format";
import type { ActiveWorkout, FitnessService } from "@/services/fitness-service";

interface SetValues {
  weight: string;
  duration: string;
  notes: string;
}

export default function TrainingPage() {
  const {
    fitness,
    ready,
    error,
    revision,
    refresh,
    setDirty,
    hasUnsavedChanges,
    activeWorkout: workout,
  } = useApp();
  const router = useRouter();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible" && !hasUnsavedChanges)
        void refresh();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
    };
  }, [hasUnsavedChanges, refresh]);

  if (error) return <Status kind="error">{error}</Status>;
  if (!ready) return <p role="status">Training wird geladen …</p>;
  if (!workout) {
    return (
      <div className="grid gap-5">
        <h1 className="text-4xl font-black text-emerald-950">
          Kein aktives Training
        </h1>
        <Status>Starte zuerst Training A oder Training B.</Status>
        <button className={buttonPrimary} onClick={() => router.push("/")}>
          Zur Startseite
        </button>
      </div>
    );
  }

  const slots = workout.plan.slots.filter(({ slot }) => slot.active);
  const workingBySlot = new Map(
    workout.results
      .filter((result) => result.setType === "working")
      .map((result) => [result.exerciseSlotId, result]),
  );
  const currentIndex = slots.findIndex(
    ({ slot }) => !workingBySlot.has(slot.id),
  );

  if (currentIndex === -1) {
    return (
      <WorkoutReview
        workout={workout}
        workingResults={slots.map(
          ({ slot }) => workingBySlot.get(slot.id) as ExerciseResult,
        )}
        message={message}
        onComplete={async () => {
          if (!fitness) return;
          try {
            await fitness.completeWorkout(workout.session.id);
            setDirty("training-review", false);
            await refresh();
            router.push("/history");
          } catch (caught) {
            setMessage(errorMessage(caught));
          }
        }}
      />
    );
  }

  const current = slots[currentIndex];
  if (!current)
    return <Status kind="error">Der aktuelle Übungsplatz fehlt.</Status>;
  const exerciseId = workout.session.exerciseSelections[current.slot.id];
  const exercise = current.exercises.find((item) => item.id === exerciseId);
  if (!exercise)
    return <Status kind="error">Die ausgewählte Übung fehlt.</Status>;
  const previous = awaitablePrevious(fitness, exercise.id, revision);

  return (
    <WorkoutStep
      key={`${workout.session.id}-${current.slot.id}-${revision}`}
      workout={workout}
      current={current}
      exercise={exercise}
      currentIndex={currentIndex}
      total={slots.length}
      previousPromise={previous}
    />
  );
}

function WorkoutStep({
  workout,
  current,
  exercise,
  currentIndex,
  total,
  previousPromise,
}: {
  workout: ActiveWorkout;
  current: ActiveWorkout["plan"]["slots"][number];
  exercise: Exercise;
  currentIndex: number;
  total: number;
  previousPromise: Promise<ExerciseResult[]>;
}) {
  const { fitness, refresh, allowNavigation } = useApp();
  const router = useRouter();
  const [previous, setPrevious] = useState<ExerciseResult[]>([]);
  const [message, setMessage] = useState<string>();
  const [selection, setSelection] = useState(exercise.id);
  const [useAsDefault, setUseAsDefault] = useState(false);
  const existingWarmup = workout.results.find(
    (result) =>
      result.exerciseSlotId === current.slot.id && result.setType === "warmup",
  );
  const locked = Boolean(
    existingWarmup ||
    workout.session.setTimer?.exerciseSlotId === current.slot.id,
  );

  useEffect(() => {
    let cancelled = false;
    void previousPromise.then((values) => {
      if (!cancelled) setPrevious(values);
    });
    return () => {
      cancelled = true;
    };
  }, [previousPromise]);

  return (
    <div className="grid gap-5">
      <header className="grid gap-4 text-center">
        <p className="text-xs font-black uppercase tracking-[0.17em] text-emerald-700">
          {workout.session.templateNameSnapshot} · Übung {currentIndex + 1} von{" "}
          {total}
        </p>
        <ExerciseImage exercise={exercise} large />
        <div>
          <h1 className="text-4xl font-black tracking-[-0.04em] text-emerald-950">
            {exercise.name}
          </h1>
          <p className="mt-1 text-slate-500">{current.slot.label}</p>
        </div>
        <progress
          max={total}
          value={currentIndex}
          aria-label="Trainingsfortschritt"
        />
      </header>

      <Card className="grid gap-4">
        <h2 className="text-lg font-black text-slate-950">Übung auswählen</h2>
        <fieldset className="grid gap-2">
          <legend className="sr-only">{current.slot.label}</legend>
          {current.exercises
            .filter((item) => item.active || item.id === exercise.id)
            .map((item) => (
              <label
                key={item.id}
                className={`flex min-h-16 items-center gap-3 rounded-2xl border p-3 transition ${
                  selection === item.id
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="exercise"
                  value={item.id}
                  checked={selection === item.id}
                  disabled={locked}
                  onChange={() => setSelection(item.id)}
                />
                <ExerciseImage exercise={item} />
                <strong>{item.name}</strong>
              </label>
            ))}
        </fieldset>
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={useAsDefault}
            disabled={locked}
            onChange={(event) => setUseAsDefault(event.target.checked)}
          />
          Als Standard verwenden
        </label>
        {locked ? (
          <Status>
            Die Auswahl ist nach dem ersten gespeicherten Satz fixiert.
          </Status>
        ) : (
          <button
            type="button"
            className={buttonSecondary}
            onClick={() =>
              void (async () => {
                if (!fitness) return;
                setMessage(undefined);
                try {
                  await fitness.selectExercise(
                    workout.session,
                    current.slot,
                    selection,
                    useAsDefault,
                  );
                  await refresh();
                } catch (caught) {
                  setMessage(errorMessage(caught));
                }
              })()
            }
          >
            Übung übernehmen
          </button>
        )}
        {message ? <Status kind="error">{message}</Status> : null}
      </Card>

      {existingWarmup ? (
        <Card className="grid gap-1">
          <h2 className="font-black">Aufwärmsatz gespeichert</h2>
          <p className="text-slate-600">
            {formatWeight(existingWarmup.weightKg)} ·{" "}
            {existingWarmup.durationSeconds} Sekunden
          </p>
        </Card>
      ) : (
        <SetCard
          workout={workout}
          slot={current.slot}
          exercise={exercise}
          setType="warmup"
          previous={previous[0]}
        />
      )}
      <SetCard
        workout={workout}
        slot={current.slot}
        exercise={exercise}
        setType="working"
        previous={previous[0]}
      />
      <PreviousResults results={previous} exercise={exercise} />
      <button
        type="button"
        className={buttonSecondary}
        onClick={() => {
          if (allowNavigation()) router.push("/");
        }}
      >
        Später fortsetzen
      </button>
    </div>
  );
}

function SetCard({
  workout,
  slot,
  exercise,
  setType,
  previous,
}: {
  workout: ActiveWorkout;
  slot: ExerciseSlot;
  exercise: Exercise;
  setType: SetType;
  previous?: ExerciseResult;
}) {
  const { fitness, refresh, setDirty } = useApp();
  const isWarmup = setType === "warmup";
  const timer = workout.session.setTimer;
  const ownsTimer =
    timer?.exerciseSlotId === slot.id && timer.setType === setType;
  const running = ownsTimer && timer.stoppedAt === null;
  const source = `${slot.id}:${setType}`;
  const [elapsed, setElapsed] = useState(() =>
    ownsTimer
      ? (timer.durationSeconds ??
        Math.max(
          0,
          Math.floor((Date.now() - Date.parse(timer.startedAt)) / 1000),
        ))
      : 0,
  );
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { isDirty },
  } = useForm<SetValues>({
    defaultValues: {
      weight:
        ownsTimer && timer.weightKg !== null
          ? String(timer.weightKg)
          : previous?.weightKg !== null && previous?.weightKg !== undefined
            ? String(previous.weightKg)
            : "",
      duration:
        ownsTimer && timer.durationSeconds !== null
          ? String(timer.durationSeconds)
          : "",
      notes: ownsTimer ? timer.notes : "",
    },
  });

  useEffect(() => {
    setDirty(source, isDirty);
    return () => setDirty(source, false);
  }, [isDirty, setDirty, source]);

  useEffect(() => {
    if (!running || !timer) return;
    const update = () =>
      setElapsed(
        Math.max(
          0,
          Math.floor((Date.now() - Date.parse(timer.startedAt)) / 1000),
        ),
      );
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [running, timer]);

  const startTimer = async () => {
    if (!fitness || timer) return;
    const values = getValues();
    if (
      exercise.equipmentType !== "bodyweight" &&
      values.weight.trim() === ""
    ) {
      setMessage("Bitte gib ein Gewicht ein.");
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      await fitness.startTimer(
        workout.session,
        slot,
        setType,
        values.weight.trim() === "" ? null : Number(values.weight),
        values.notes,
      );
      setDirty(source, false);
      await refresh();
    } catch (caught) {
      setMessage(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const stopTimer = async () => {
    if (!fitness) return;
    setBusy(true);
    setMessage(undefined);
    try {
      await fitness.stopTimer(workout.session);
      await refresh();
    } catch (caught) {
      setMessage(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const save = handleSubmit(async (values) => {
    if (!fitness) return;
    setBusy(true);
    setMessage(undefined);
    try {
      await fitness.saveSet(workout.session, slot, {
        setType,
        weightKg: values.weight.trim() === "" ? null : Number(values.weight),
        durationSeconds: Number(values.duration),
        notes: values.notes,
      });
      setDirty(source, false);
      await refresh();
    } catch (caught) {
      setMessage(
        errorMessage(caught, "Das Ergebnis konnte nicht gespeichert werden."),
      );
    } finally {
      setBusy(false);
    }
  });

  const hint =
    elapsed >= 90
      ? "90 Sekunden erreicht – Timer läuft weiter."
      : elapsed >= 60
        ? "Zielbereich erreicht."
        : "Zielbereich: 60–90 Sekunden";

  return (
    <form
      onSubmit={save}
      data-set-type={setType}
      className={`grid gap-5 rounded-3xl border p-5 shadow-[0_16px_48px_rgba(10,33,27,0.07)] ${
        isWarmup
          ? "border-slate-200 bg-white"
          : "border-emerald-300 bg-emerald-50/90"
      }`}
    >
      <div>
        <p className="text-xs font-black uppercase tracking-[0.15em] text-emerald-700">
          {isWarmup ? "Optional" : "Hauptsatz"}
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">
          {isWarmup ? "Aufwärmsatz" : "Arbeitssatz"}
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={
            exercise.equipmentType === "bodyweight"
              ? "Zusatzgewicht (kg)"
              : "Gewicht (kg)"
          }
          hint={
            exercise.equipmentType === "bodyweight"
              ? "Leer lassen für reines Körpergewicht"
              : undefined
          }
        >
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            min="0"
            max="100000"
            step="any"
            required={exercise.equipmentType !== "bodyweight"}
            disabled={running}
            {...register("weight")}
          />
        </Field>
        <Field
          label="Gemessene Dauer (Sekunden)"
          hint="Nach dem Stoppen bei Bedarf korrigierbar"
        >
          <input
            className={inputClass}
            type="number"
            inputMode="numeric"
            min="1"
            max="86400"
            step="1"
            required
            readOnly={!ownsTimer || running}
            {...register("duration")}
          />
        </Field>
      </div>
      <div className="rounded-3xl bg-emerald-950 p-5 text-center text-white">
        <output
          data-timer-display
          aria-live="off"
          className={`block text-6xl font-black tabular-nums tracking-[-0.06em] ${
            elapsed >= 90
              ? "text-amber-300"
              : elapsed >= 60
                ? "text-emerald-300"
                : "text-white"
          }`}
        >
          {elapsed} s
        </output>
        <p className="mt-2 text-sm text-emerald-100/75">{hint}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="min-h-14 rounded-2xl bg-emerald-400 px-5 text-lg font-black text-emerald-950 disabled:opacity-35"
            disabled={Boolean(timer) || busy}
            onClick={() => void startTimer()}
          >
            Start
          </button>
          <button
            type="button"
            data-timer-control="stop"
            className="min-h-14 rounded-2xl bg-amber-300 px-5 text-lg font-black text-amber-950 disabled:opacity-35"
            disabled={!running || busy}
            onClick={() => void stopTimer()}
          >
            Stop
          </button>
        </div>
      </div>
      <Field label="Notiz (optional)">
        <textarea
          className={inputClass}
          rows={2}
          maxLength={2000}
          {...register("notes")}
        />
      </Field>
      {message ? <Status kind="error">{message}</Status> : null}
      <button
        type="submit"
        className={isWarmup ? buttonSecondary : buttonPrimary}
        disabled={!ownsTimer || timer.durationSeconds === null || busy}
      >
        {isWarmup ? "Aufwärmsatz speichern" : "Arbeitssatz speichern & weiter"}
      </button>
    </form>
  );
}

function PreviousResults({
  results,
  exercise,
}: {
  results: ExerciseResult[];
  exercise: Exercise;
}) {
  return (
    <Card className="grid gap-4">
      <h2 className="text-xl font-black">Bisherige Ergebnisse</h2>
      {results.length === 0 ? (
        <p className="text-slate-500">Noch kein Arbeitssatz gespeichert.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {results.slice(0, 5).map((result) => (
              <li
                key={result.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0"
              >
                <strong>
                  {formatWeight(result.weightKg)} · {result.durationSeconds} s
                </strong>
                <span className="text-xs text-slate-500">
                  {formatDate(result.createdAt)}
                </span>
              </li>
            ))}
          </ul>
          <Recommendation
            result={results[0] as ExerciseResult}
            exercise={exercise}
          />
        </>
      )}
    </Card>
  );
}

function Recommendation({
  result,
  exercise,
}: {
  result: ExerciseResult;
  exercise: Exercise;
}) {
  const recommendation = recommendNextWeight(
    result.weightKg,
    result.durationSeconds,
    exercise.weightIncrementKg,
  );
  const text =
    recommendation.action === "increase"
      ? recommendation.suggestedWeightKg === null
        ? "Über 90 Sekunden: Schwierigkeit oder Zusatzgewicht beim nächsten Mal um etwa 2,5 % erhöhen."
        : `Über 90 Sekunden: Nächstes Mal unverbindlich ${formatWeight(recommendation.suggestedWeightKg)} (+2,5 %) versuchen.`
      : recommendation.durationBand === "below-target"
        ? "Unter 60 Sekunden: Gewicht zunächst beibehalten; bei unsauberer Ausführung reduzieren."
        : "60–90 Sekunden: Gewicht beim nächsten Mal beibehalten.";
  return <Status>{text}</Status>;
}

function WorkoutReview({
  workout,
  workingResults,
  message,
  onComplete,
}: {
  workout: ActiveWorkout;
  workingResults: ExerciseResult[];
  message?: string;
  onComplete(): Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid gap-5">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.17em] text-emerald-700">
          {workout.session.templateNameSnapshot}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] text-emerald-950">
          Training prüfen
        </h1>
        <p className="mt-2 text-slate-600">
          Alle {workingResults.length} Arbeitssätze sind gespeichert.
        </p>
      </header>
      <Card>
        <ol className="divide-y divide-slate-100">
          {workingResults.map((result) => {
            const exercise = workout.plan.slots
              .flatMap(({ exercises }) => exercises)
              .find((item) => item.id === result.exerciseId);
            return (
              <li
                key={result.id}
                className="grid gap-2 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex justify-between gap-4">
                  <strong>{result.exerciseNameSnapshot}</strong>
                  <span className="text-sm text-slate-600">
                    {formatWeight(result.weightKg)} · {result.durationSeconds} s
                  </span>
                </div>
                {exercise ? (
                  <Recommendation result={result} exercise={exercise} />
                ) : null}
              </li>
            );
          })}
        </ol>
      </Card>
      {message ? <Status kind="error">{message}</Status> : null}
      <button
        className={buttonPrimary}
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void onComplete().finally(() => setBusy(false));
        }}
      >
        {busy ? "Wird abgeschlossen …" : "Training abschließen"}
      </button>
    </div>
  );
}

function ExerciseImage({
  exercise,
  large = false,
}: {
  exercise: Exercise;
  large?: boolean;
}) {
  const size = large
    ? "mx-auto size-32 rounded-[2rem] text-5xl"
    : "size-11 rounded-xl text-lg";
  if (!exercise.image) {
    return (
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center bg-emerald-100 font-black text-emerald-900 ${size}`}
      >
        {exercise.name.slice(0, 1)}
      </span>
    );
  }
  // Stored images are already resized locally before being written to IndexedDB.
  return (
    <img
      src={large ? exercise.image.dataUrl : exercise.image.thumbnailDataUrl}
      alt=""
      className={`shrink-0 object-cover ${size}`}
    />
  );
}

function awaitablePrevious(
  fitness: FitnessService | undefined,
  exerciseId: string,
  revision: number,
): Promise<ExerciseResult[]> {
  void revision;
  return fitness
    ? fitness.previousWorkingResults(exerciseId)
    : Promise.resolve([]);
}
