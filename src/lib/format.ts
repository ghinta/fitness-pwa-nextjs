export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("de-AT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatWeight(value: number | null): string {
  return value === null
    ? "Körpergewicht"
    : `${new Intl.NumberFormat("de-AT", { maximumFractionDigits: 2 }).format(value)} kg`;
}

export function errorMessage(
  error: unknown,
  fallback = "Die Aktion konnte nicht ausgeführt werden.",
): string {
  return error instanceof Error ? error.message : fallback;
}

export function downloadText(contents: string, filename: string): void {
  const url = URL.createObjectURL(
    new Blob([contents], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
