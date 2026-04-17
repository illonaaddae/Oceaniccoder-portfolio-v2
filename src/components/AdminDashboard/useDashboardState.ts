import { useDashboardCore } from "./useDashboardCore";
import { useDashboardHandlers } from "./useDashboardHandlers";

export function useDashboardState(isReadOnly: boolean) {
  const core = useDashboardCore();
  const handlers = useDashboardHandlers(
    isReadOnly,
    core.showError,
    core.showSuccess,
    core.adminData,
  );
  return { ...core, ...handlers };
}

export type DashboardState = ReturnType<typeof useDashboardState>;
