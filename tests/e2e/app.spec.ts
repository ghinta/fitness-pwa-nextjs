import { expect, test } from "@playwright/test";

test("navigates through the local app shell", async ({ page }) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { level: 1, name: "Bereit fürs Training" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Verlauf" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Verlauf" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Einstellungen" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Einstellungen" }),
  ).toBeVisible();
});

test("completes a six-exercise workout with persisted timers", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Training A starten" }).click();

  for (let index = 0; index < 6; index += 1) {
    const working = page.locator('form[data-set-type="working"]');
    await expect(working).toBeVisible();
    await working
      .locator('input[name="weight"]')
      .fill(String(40 + index * 2.5));
    await working.getByRole("button", { name: "Start" }).click();
    await working.getByRole("button", { name: "Stop" }).click();
    await expect(working.getByLabel("Gemessene Dauer (Sekunden)")).toHaveValue(
      "1",
    );
    await working
      .getByRole("button", { name: "Arbeitssatz speichern & weiter" })
      .click();
    if (index < 5) {
      await expect(
        page.getByText(`Übung ${index + 2} von 6`, { exact: false }),
      ).toBeVisible();
    }
  }

  await expect(
    page.getByRole("heading", { level: 1, name: "Training prüfen" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Training abschließen" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Verlauf" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Training A/ })).toBeVisible();
});

test("installs a scoped service worker and precaches the offline shell", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);

  const cacheState = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const assets = Array.from(
      document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
        'script[src], link[rel="stylesheet"]',
      ),
      (element) =>
        element instanceof HTMLScriptElement ? element.src : element.href,
    );
    const cacheNames = await caches.keys();
    const cachedRequests = (
      await Promise.all(
        cacheNames.map(async (name) => (await caches.open(name)).keys()),
      )
    ).flat();
    const cachedPaths = new Set(
      cachedRequests.map((request) => new URL(request.url).pathname),
    );
    const scopePath = new URL(registration.scope).pathname;
    return {
      scope: scopePath,
      root: cachedPaths.has(scopePath),
      assets: assets.every((url) => cachedPaths.has(new URL(url).pathname)),
    };
  });
  expect(cacheState).toEqual({
    scope: "/fitness-pwa-nextjs/",
    root: true,
    assets: true,
  });
});
