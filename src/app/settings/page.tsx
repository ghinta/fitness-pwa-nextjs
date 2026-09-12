"use client";
/* eslint-disable @next/next/no-img-element -- exercise images are local IndexedDB data URLs */

import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";

import { useApp } from "@/components/app-provider";
import {
  buttonDanger,
  buttonPrimary,
  buttonSecondary,
  Card,
  Field,
  inputClass,
  Status,
} from "@/components/ui";
import type { EquipmentType, Exercise, ExerciseSlot } from "@/domain";
import { downloadText, errorMessage, formatDate } from "@/lib/format";
import {
  MAX_IMPORT_BYTES,
  type PreparedImport,
} from "@/services/backup-service";
import { prepareExerciseImage } from "@/services/exercise-image-service";
import type { TemplatePlan } from "@/services/fitness-service";

interface SettingsData {
  plans: TemplatePlan[];
  exercises: Exercise[];
}

interface ExerciseFormValues {
  name: string;
  muscleGroup: string;
  movementCategory: string;
  equipmentType: EquipmentType;
  weightIncrementKg: string;
}

export default function SettingsPage() {
  const { fitness, ready, error, revision } = useApp();
  const [data, setData] = useState<SettingsData>();

  useEffect(() => {
    if (!fitness) return;
    let cancelled = false;
    void Promise.all([
      fitness.listPlans(true),
      fitness.repositories.exercises.list(true),
    ]).then(([plans, exercises]) => {
      if (!cancelled) setData({ plans, exercises });
    });
    return () => {
      cancelled = true;
    };
  }, [fitness, revision]);

  if (error) return <Status kind="error">{error}</Status>;
  if (!ready || !data)
    return <p role="status">Einstellungen werden geladen …</p>;

  return (
    <div className="grid gap-8">
      <header className="grid gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
          Deine Konfiguration
        </p>
        <h1 className="text-4xl font-black tracking-[-0.04em] text-emerald-950">
          Einstellungen
        </h1>
        <p className="text-slate-600">
          Trainingspläne, Übungen und lokale Sicherungen verwalten.
        </p>
      </header>

      <section className="grid gap-4">
        <h2 className="text-2xl font-black text-slate-950">Trainingspläne</h2>
        {data.plans.map((plan) => (
          <TemplateEditor
            key={plan.template.id}
            plan={plan}
            exercises={data.exercises}
          />
        ))}
      </section>

      <section className="grid gap-4">
        <h2 className="text-2xl font-black text-slate-950">Übungen</h2>
        <CreateExercise exercises={data.exercises} />
        <Card className="divide-y divide-slate-100 p-0">
          {[...data.exercises]
            .sort((left, right) => left.name.localeCompare(right.name, "de"))
            .map((exercise) => (
              <ExerciseEditor key={exercise.id} exercise={exercise} />
            ))}
        </Card>
      </section>

      <BackupPanel />

      <Card className="grid gap-2">
        <h2 className="text-xl font-black">Datenschutz auf diesem Gerät</h2>
        <p className="text-sm leading-6 text-slate-600">
          Alle Daten bleiben im Browser dieses Geräts. Die lokale Datenbank und
          exportierte Sicherungen sind nicht zusätzlich verschlüsselt.
        </p>
      </Card>
    </div>
  );
}

function TemplateEditor({
  plan,
  exercises,
}: {
  plan: TemplatePlan;
  exercises: Exercise[];
}) {
  const { fitness, refresh } = useApp();
  const [name, setName] = useState(plan.template.name);
  const [active, setActive] = useState(plan.template.active);
  const [message, setMessage] = useState<string>();

  return (
    <details className="rounded-3xl border border-slate-200 bg-white shadow-[0_16px_48px_rgba(10,33,27,0.06)]">
      <summary className="flex min-h-16 items-center justify-between px-5 py-4 text-lg font-black text-slate-950 marker:text-emerald-700">
        {plan.template.name}
        {!plan.template.active ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            Deaktiviert
          </span>
        ) : null}
      </summary>
      <div className="grid gap-5 border-t border-slate-100 p-5">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void (async () => {
              if (!fitness) return;
              try {
                await fitness.updateTemplate(plan.template, { name, active });
                await refresh();
              } catch (caught) {
                setMessage(errorMessage(caught));
              }
            })();
          }}
        >
          <Field label="Name">
            <input
              className={inputClass}
              value={name}
              required
              maxLength={120}
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <Check checked={active} onChange={setActive}>
            Plan auf der Startseite anzeigen
          </Check>
          {message ? <Status kind="error">{message}</Status> : null}
          <button className={buttonSecondary}>Plan speichern</button>
        </form>
        <div className="grid gap-3">
          {plan.slots.map(({ slot }) => (
            <SlotEditor
              key={slot.id}
              plan={plan}
              slot={slot}
              exercises={exercises}
            />
          ))}
        </div>
      </div>
    </details>
  );
}

function SlotEditor({
  plan,
  slot,
  exercises,
}: {
  plan: TemplatePlan;
  slot: ExerciseSlot;
  exercises: Exercise[];
}) {
  const { fitness, refresh } = useApp();
  const eligible = exercises.filter(
    (exercise) => exercise.movementCategory === slot.movementCategory,
  );
  const [primary, setPrimary] = useState(slot.primaryExerciseId);
  const [alternatives, setAlternatives] = useState(
    () => new Set(slot.alternativeExerciseIds),
  );
  const [active, setActive] = useState(slot.active);
  const [message, setMessage] = useState<string>();
  const minOrder = Math.min(...plan.slots.map(({ slot: item }) => item.order));
  const maxOrder = Math.max(...plan.slots.map(({ slot: item }) => item.order));

  const run = async (action: () => Promise<void>) => {
    setMessage(undefined);
    try {
      await action();
      await refresh();
    } catch (caught) {
      setMessage(errorMessage(caught));
    }
  };

  return (
    <form
      data-testid={`slot-editor-${slot.id}`}
      className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!fitness) return;
        void run(() =>
          fitness.updateSlot({
            ...slot,
            primaryExerciseId: primary,
            alternativeExerciseIds: [...alternatives].filter(
              (id) => id !== primary,
            ),
            active,
          }),
        );
      }}
    >
      <h3 className="font-black text-slate-950">
        {slot.order}. {slot.label}
      </h3>
      <Field label="Hauptübung">
        <select
          className={inputClass}
          value={primary}
          onChange={(event) => {
            const value = event.target.value;
            setPrimary(value);
            setAlternatives((current) => {
              const next = new Set(current);
              next.delete(value);
              return next;
            });
          }}
        >
          {eligible.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
              {exercise.active ? "" : " (deaktiviert)"}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-semibold">Alternativen</legend>
        {eligible.map((exercise) => (
          <Check
            key={exercise.id}
            checked={alternatives.has(exercise.id)}
            disabled={exercise.id === primary}
            onChange={(checked) =>
              setAlternatives((current) => {
                const next = new Set(current);
                if (checked) next.add(exercise.id);
                else next.delete(exercise.id);
                return next;
              })
            }
          >
            {exercise.name}
            {exercise.active ? "" : " (deaktiviert)"}
          </Check>
        ))}
      </fieldset>
      <Check checked={active} onChange={setActive}>
        Übungsplatz aktiv
      </Check>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={buttonSecondary}
          disabled={slot.order === minOrder}
          onClick={() =>
            fitness && void run(() => fitness.moveSlot(plan, slot.id, -1))
          }
        >
          Nach oben
        </button>
        <button
          type="button"
          className={buttonSecondary}
          disabled={slot.order === maxOrder}
          onClick={() =>
            fitness && void run(() => fitness.moveSlot(plan, slot.id, 1))
          }
        >
          Nach unten
        </button>
      </div>
      {message ? <Status kind="error">{message}</Status> : null}
      <button className={buttonSecondary}>Übungsplatz speichern</button>
    </form>
  );
}

function CreateExercise({ exercises }: { exercises: Exercise[] }) {
  const { fitness, refresh } = useApp();
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const categories = useMemo(
    () => [...new Set(exercises.map((exercise) => exercise.movementCategory))],
    [exercises],
  );
  const { register, handleSubmit, reset } = useForm<ExerciseFormValues>({
    defaultValues: {
      name: "",
      muscleGroup: "",
      movementCategory: "",
      equipmentType: "machine",
      weightIncrementKg: "2.5",
    },
  });

  return (
    <details
      data-testid="create-exercise-details"
      className="rounded-3xl border border-emerald-200 bg-emerald-50"
    >
      <summary className="px-5 py-4 font-black text-emerald-950">
        Neue Übung hinzufügen
      </summary>
      <form
        data-testid="create-exercise"
        className="grid gap-4 border-t border-emerald-200 p-5"
        onSubmit={handleSubmit(async (values) => {
          if (!fitness) return;
          setMessage(undefined);
          try {
            await fitness.createExercise({
              ...values,
              weightIncrementKg: Number(values.weightIncrementKg),
            });
            reset();
            setMessage({ text: "Übung wurde hinzugefügt.", error: false });
            await refresh();
          } catch (caught) {
            setMessage({ text: errorMessage(caught), error: true });
          }
        })}
      >
        <Field label="Name">
          <input
            className={inputClass}
            required
            maxLength={120}
            {...register("name")}
          />
        </Field>
        <Field label="Muskelgruppe">
          <input
            className={inputClass}
            required
            maxLength={80}
            {...register("muscleGroup")}
          />
        </Field>
        <Field
          label="Bewegungskategorie"
          hint="Einer vorhandenen Slot-Kategorie zuordnen"
        >
          <input
            className={inputClass}
            required
            maxLength={80}
            list="movement-categories"
            {...register("movementCategory")}
          />
        </Field>
        <datalist id="movement-categories">
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <Field label="Geräteart">
          <select className={inputClass} {...register("equipmentType")}>
            <option value="bodyweight">Körpergewicht</option>
            <option value="free-weight">Freies Gewicht</option>
            <option value="machine">Maschine</option>
            <option value="cable">Kabelzug</option>
          </select>
        </Field>
        <Field label="Gewichtsschritt (kg)">
          <input
            className={inputClass}
            type="number"
            inputMode="decimal"
            min="0.01"
            max="1000"
            step="any"
            required
            {...register("weightIncrementKg")}
          />
        </Field>
        {message ? (
          <Status kind={message.error ? "error" : "success"}>
            {message.text}
          </Status>
        ) : null}
        <button className={buttonPrimary}>Übung hinzufügen</button>
      </form>
    </details>
  );
}

function ExerciseEditor({ exercise }: { exercise: Exercise }) {
  const { fitness, refresh } = useApp();
  const [message, setMessage] = useState<string>();
  const [imageBusy, setImageBusy] = useState(false);
  const { register, handleSubmit } = useForm<{
    name: string;
    muscleGroup: string;
    weightIncrementKg: string;
    active: boolean;
  }>({
    defaultValues: {
      name: exercise.name,
      muscleGroup: exercise.muscleGroup,
      weightIncrementKg: String(exercise.weightIncrementKg),
      active: exercise.active,
    },
  });

  const saveImage = async (file?: File) => {
    if (!fitness || !file) return;
    setImageBusy(true);
    setMessage(undefined);
    try {
      await fitness.updateExerciseImage(
        exercise,
        await prepareExerciseImage(file),
      );
      await refresh();
    } catch (caught) {
      setMessage(errorMessage(caught));
    } finally {
      setImageBusy(false);
    }
  };

  return (
    <details className="group px-5 py-1">
      <summary className="flex min-h-17 items-center gap-3 py-3 marker:text-emerald-700">
        <ExerciseThumb exercise={exercise} />
        <span className="grid min-w-0">
          <strong className="truncate text-slate-950">{exercise.name}</strong>
          <span className="truncate text-sm text-slate-500">
            {exercise.muscleGroup} · {exercise.movementCategory}
            {exercise.active ? "" : " · deaktiviert"}
          </span>
        </span>
      </summary>
      <form
        className="grid gap-4 pb-5 pl-0 sm:pl-14"
        onSubmit={handleSubmit(async (values) => {
          if (!fitness) return;
          setMessage(undefined);
          try {
            await fitness.updateExercise(exercise, {
              name: values.name,
              muscleGroup: values.muscleGroup,
              weightIncrementKg: Number(values.weightIncrementKg),
              active: values.active,
            });
            await refresh();
          } catch (caught) {
            setMessage(errorMessage(caught));
          }
        })}
      >
        <Field label="Name">
          <input
            className={inputClass}
            required
            maxLength={120}
            {...register("name")}
          />
        </Field>
        <Field label="Muskelgruppe">
          <input
            className={inputClass}
            required
            maxLength={80}
            {...register("muscleGroup")}
          />
        </Field>
        <Field label="Gewichtsschritt (kg)">
          <input
            className={inputClass}
            type="number"
            min="0.01"
            max="1000"
            step="any"
            required
            {...register("weightIncrementKg")}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label={exercise.image ? "Bild ersetzen" : "Bild aus Mediathek"}
            hint="Wird vor dem lokalen Speichern verkleinert"
          >
            <input
              className={inputClass}
              type="file"
              accept="image/*"
              disabled={imageBusy}
              onChange={(event) => void saveImage(event.target.files?.[0])}
            />
          </Field>
          <Field label="Foto aufnehmen">
            <input
              className={inputClass}
              type="file"
              accept="image/*"
              capture="environment"
              disabled={imageBusy}
              onChange={(event) => void saveImage(event.target.files?.[0])}
            />
          </Field>
        </div>
        {exercise.image ? (
          <button
            type="button"
            className={buttonDanger}
            disabled={imageBusy}
            onClick={() =>
              fitness &&
              void fitness
                .updateExerciseImage(exercise, null)
                .then(refresh)
                .catch((caught: unknown) => setMessage(errorMessage(caught)))
            }
          >
            Bild entfernen
          </button>
        ) : null}
        <Check registered={register("active")}>Übung aktiv</Check>
        <p className="text-xs leading-5 text-slate-500">
          Geräteart und Kategorie bleiben zum Schutz des Verlaufs unverändert:{" "}
          {exercise.movementCategory}.
        </p>
        {message ? <Status kind="error">{message}</Status> : null}
        <button className={buttonSecondary}>Übung speichern</button>
      </form>
    </details>
  );
}

function ExerciseThumb({ exercise }: { exercise: Exercise }) {
  if (!exercise.image) {
    return (
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 font-black text-emerald-900"
      >
        {exercise.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <img
      src={exercise.image.thumbnailDataUrl}
      alt=""
      className="size-11 shrink-0 rounded-xl object-cover"
    />
  );
}

function BackupPanel() {
  const { backup, refresh } = useApp();
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [prepared, setPrepared] = useState<PreparedImport>();
  const [busy, setBusy] = useState(false);

  return (
    <section className="grid gap-4">
      <h2 className="text-2xl font-black text-slate-950">Sicherung</h2>
      <Card className="grid gap-5">
        <p className="text-sm leading-6 text-slate-600">
          Die JSON-Datei enthält alle Trainingsdaten im Klartext. Bewahre sie
          sicher auf.
        </p>
        <button
          type="button"
          className={buttonPrimary}
          disabled={!backup || busy}
          onClick={() =>
            void (async () => {
              if (!backup) return;
              try {
                downloadText(
                  await backup.createJson(),
                  `fitness-pwa-nextjs-${new Date().toISOString().slice(0, 10)}.json`,
                );
                setMessage({ text: "Sicherung wurde erstellt.", error: false });
              } catch (caught) {
                setMessage({ text: errorMessage(caught), error: true });
              }
            })()
          }
        >
          Alle Daten exportieren
        </button>
        <Field
          label="Sicherung importieren"
          hint="Maximal 50 MiB; vorhandene Daten werden erst nach Bestätigung ersetzt."
        >
          <input
            className={inputClass}
            type="file"
            accept="application/json,.json"
            onChange={(event) =>
              void (async () => {
                const file = event.target.files?.[0];
                if (!file || !backup) return;
                setPrepared(undefined);
                try {
                  if (file.size > MAX_IMPORT_BYTES)
                    throw new Error("Die Datei ist größer als 50 MiB.");
                  setPrepared(backup.prepareImport(await file.text()));
                  setMessage(undefined);
                } catch (caught) {
                  setMessage({ text: errorMessage(caught), error: true });
                }
              })()
            }
          />
        </Field>
        {prepared ? (
          <div className="grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-black text-emerald-950">Gültige Sicherung</h3>
            <p className="text-sm leading-6 text-emerald-900">
              {prepared.summary.exercises} Übungen, {prepared.summary.templates}{" "}
              Pläne, {prepared.summary.sessions} Trainings,{" "}
              {prepared.summary.results} Ergebnisse · Export{" "}
              {formatDate(prepared.summary.exportedAt)}
            </p>
            <button
              type="button"
              className={buttonDanger}
              disabled={busy}
              onClick={() =>
                void (async () => {
                  if (!backup) return;
                  if (
                    !window.confirm(
                      "Alle aktuellen Daten durch diese Sicherung ersetzen? Vorher wird automatisch eine Sicherung heruntergeladen.",
                    )
                  )
                    return;
                  setBusy(true);
                  try {
                    downloadText(
                      await backup.createJson(),
                      `vor-import-${new Date().toISOString().slice(0, 10)}.json`,
                    );
                    await backup.replace(prepared);
                    setPrepared(undefined);
                    setMessage({
                      text: "Import erfolgreich abgeschlossen.",
                      error: false,
                    });
                    await refresh();
                  } catch (caught) {
                    setMessage({ text: errorMessage(caught), error: true });
                  } finally {
                    setBusy(false);
                  }
                })()
              }
            >
              Sicherung importieren
            </button>
          </div>
        ) : null}
        {message ? (
          <Status kind={message.error ? "error" : "success"}>
            {message.text}
          </Status>
        ) : null}
      </Card>
    </section>
  );
}

function Check({
  checked,
  disabled,
  onChange,
  registered,
  children,
}: {
  checked?: boolean;
  disabled?: boolean;
  onChange?(checked: boolean): void;
  registered?: UseFormRegisterReturn;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-800">
      <input
        type="checkbox"
        checked={registered ? undefined : checked}
        disabled={disabled}
        onChange={
          registered ? undefined : (event) => onChange?.(event.target.checked)
        }
        {...registered}
      />
      <span>{children}</span>
    </label>
  );
}
