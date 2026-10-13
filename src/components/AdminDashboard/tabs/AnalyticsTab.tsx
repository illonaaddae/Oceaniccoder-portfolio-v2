import { Suspense, lazy } from "react";

// Charts (recharts) load only when the tab opens, keeping them out of the
// main admin bundle.
const AnalyticsShell = lazy(() => import("./Analytics/AnalyticsShell"));

interface AnalyticsTabProps {
  theme: "light" | "dark";
}

export default function AnalyticsTab({ theme }: AnalyticsTabProps) {
  return (
    <Suspense
      fallback={
        <p className="py-16 text-center" role="status" style={{ color: "var(--text-secondary)" }}>
          Loading analytics…
        </p>
      }
    >
      <AnalyticsShell theme={theme} />
    </Suspense>
  );
}
