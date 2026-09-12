"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { BackupService } from "@/services/backup-service";
import { FitnessService, type ActiveWorkout } from "@/services/fitness-service";
import {
  createRepositories,
  FitnessDatabase,
  openFitnessDatabase,
} from "@/storage";

interface AppContextValue {
  fitness?: FitnessService;
  backup?: BackupService;
  ready: boolean;
  error?: string;
  revision: number;
  activeWorkout?: ActiveWorkout;
  hasUnsavedChanges: boolean;
  timerRunning: boolean;
  refresh(): Promise<void>;
  setDirty(source: string, value: boolean): void;
  allowNavigation(): boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [fitness, setFitness] = useState<FitnessService>();
  const [backup, setBackup] = useState<BackupService>();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout>();
  const [dirtySources, setDirtySources] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const refresh = useCallback(async () => {
    if (!fitness) return;
    setActiveWorkout(await fitness.getActiveWorkout());
    setRevision((value) => value + 1);
  }, [fitness]);

  useEffect(() => {
    let cancelled = false;
    const database = new FitnessDatabase();
    void (async () => {
      try {
        await openFitnessDatabase(database);
        const repositories = createRepositories(database);
        const nextFitness = new FitnessService(repositories);
        const nextBackup = new BackupService(repositories.snapshots);
        const active = await nextFitness.getActiveWorkout();
        if (cancelled) return;
        setFitness(nextFitness);
        setBackup(nextBackup);
        setActiveWorkout(active);
        setReady(true);
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Der lokale Speicher konnte nicht geöffnet werden.",
        );
      }
    })();
    return () => {
      cancelled = true;
      database.close();
    };
  }, []);

  const setDirty = useCallback((source: string, value: boolean) => {
    setDirtySources((current) => {
      const next = new Set(current);
      if (value) next.add(source);
      else next.delete(source);
      return next;
    });
  }, []);

  const hasUnsavedChanges = dirtySources.size > 0;
  const timerRunning = activeWorkout?.session.setTimer?.stoppedAt === null;

  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges || timerRunning) event.preventDefault();
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [hasUnsavedChanges, timerRunning]);

  const allowNavigation = useCallback(() => {
    if (!hasUnsavedChanges && !timerRunning) return true;
    const confirmed = window.confirm(
      timerRunning
        ? "Der Timer läuft noch. Training wirklich verlassen?"
        : "Nicht gespeicherte Eingaben verwerfen?",
    );
    if (confirmed) setDirtySources(new Set());
    return confirmed;
  }, [hasUnsavedChanges, timerRunning]);

  const value = useMemo<AppContextValue>(
    () => ({
      fitness,
      backup,
      ready,
      error,
      revision,
      activeWorkout,
      hasUnsavedChanges,
      timerRunning,
      refresh,
      setDirty,
      allowNavigation,
    }),
    [
      fitness,
      backup,
      ready,
      error,
      revision,
      activeWorkout,
      hasUnsavedChanges,
      timerRunning,
      refresh,
      setDirty,
      allowNavigation,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("AppProvider fehlt.");
  return value;
}
