// The owner's private finance section. Admin only: the sidebar hides it on the
// public read-only dashboard, TabContentExtra never renders it there, and
// /api/finance refuses anyone without the admin session.
import { useState } from "react";
import { TabHeader } from "@/components/ui/TabHeader";
import { FilterPills } from "@/components/ui/FilterPills";
import { ErrorBanner, RefreshControl } from "../shared/controls";
import { useFinance } from "./useFinance";
import { OverviewView } from "./OverviewView";
import { FundsView } from "./FundsView";
import { BudgetView } from "./BudgetView";
import { SpendingView } from "./SpendingView";
import { TransactionsView } from "./TransactionsView";
import { ExpectedView } from "./ExpectedView";
import { FinanceThemeContext, muted } from "./ui";

const VIEWS = [
  { key: "overview", label: "Overview" },
  { key: "funds", label: "Funds" },
  { key: "budget", label: "Budget" },
  { key: "spending", label: "Spending" },
  { key: "transactions", label: "Transactions" },
  { key: "expected", label: "Expected" },
] as const;

type View = (typeof VIEWS)[number]["key"];

export default function FinanceTab({ theme }: { theme: "light" | "dark" }) {
  const state = useFinance();
  const [view, setView] = useState<View>("overview");

  return (
    <FinanceThemeContext.Provider value={theme}>
      <div className="finance-dash">
        <TabHeader
          theme={theme}
          title="Finance"
          subtitle="Your money, savings and goals. Only you can see this."
          customAction={
            <RefreshControl
              updatedAt={state.updatedAt}
              stale={state.stale}
              loading={state.loading}
              onRefresh={() => void state.reload()}
            />
          }
        />
        <FilterPills
          tabs={VIEWS.map((v) => ({ key: v.key, label: v.label }))}
          active={view}
          onChange={(k) => setView(k as View)}
          theme={theme}
          className="mb-6"
        />
        {state.error && (
          <div className="mb-4">
            <ErrorBanner message={state.error} onDismiss={state.clearError} />
          </div>
        )}
        {!state.loaded ? (
          <p className="text-sm" style={muted} role="status">
            {state.loading ? "Loading your finances…" : "Couldn't load your finances. Try Refresh."}
          </p>
        ) : (
          <>
            {view === "overview" && <OverviewView state={state} />}
            {view === "funds" && <FundsView state={state} />}
            {view === "budget" && <BudgetView state={state} />}
            {view === "spending" && <SpendingView state={state} />}
            {view === "transactions" && <TransactionsView state={state} />}
            {view === "expected" && <ExpectedView state={state} />}
          </>
        )}
      </div>
    </FinanceThemeContext.Provider>
  );
}
