// The owner's living CV. Admin only, like Finance: the sidebar hides it on the
// public read-only dashboard, TabContentExtra never renders it there, and
// /api/cv refuses anyone without the admin session.
import { useState } from "react";
import { TabHeader } from "@/components/ui/TabHeader";
import { FilterPills } from "@/components/ui/FilterPills";
import { ErrorBanner, RefreshControl } from "../shared/controls";
// The Finance building blocks read the dashboard theme from this context.
import { FinanceThemeContext, muted } from "../Finance/ui";
import { useCv } from "./useCv";
import { SectionsView } from "./SectionsView";
import { ProfileView } from "./ProfileView";

const VIEWS = [
  { key: "sections", label: "Sections" },
  { key: "profile", label: "Profile" },
] as const;

type View = (typeof VIEWS)[number]["key"];

const timeOf = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function CvTab({ theme }: { theme: "light" | "dark" }) {
  const state = useCv();
  const [view, setView] = useState<View>("sections");

  async function refresh() {
    if (await state.reload()) state.announce(`Updated ${timeOf(new Date())}`);
  }

  return (
    <FinanceThemeContext.Provider value={theme}>
      <div className="cv-dash">
        <TabHeader
          theme={theme}
          title="CV"
          subtitle="What goes on your CV and in what order. Only you can see this."
          customAction={
            <RefreshControl
              updatedAt={state.updatedAt}
              stale={state.stale}
              loading={state.loading}
              onRefresh={() => void refresh()}
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
        <p role="status" className="sr-only">
          <span key={state.announcement.n}>{state.announcement.text}</span>
        </p>
        {state.error && (
          <div className="mb-4">
            <ErrorBanner message={state.error} onDismiss={state.clearError} />
          </div>
        )}
        {!state.loaded ? (
          <p className="text-sm" style={muted} role="status">
            {state.loading ? "Loading your CV…" : "Couldn't load your CV. Try Refresh."}
          </p>
        ) : (
          // Focus lands here when a change takes away the last row of a list.
          <div data-cv-view tabIndex={-1} className="outline-none">
            {view === "sections" && <SectionsView state={state} />}
            {view === "profile" && <ProfileView state={state} />}
          </div>
        )}
      </div>
    </FinanceThemeContext.Provider>
  );
}
