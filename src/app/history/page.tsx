import { Suspense } from "react";

import { HistoryClient } from "./history-client";

export default function HistoryPage() {
  return (
    <Suspense fallback={<p role="status">Verlauf wird geladen …</p>}>
      <HistoryClient />
    </Suspense>
  );
}
