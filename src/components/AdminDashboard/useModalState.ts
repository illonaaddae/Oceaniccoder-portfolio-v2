import { useCallback } from "react";
import { useEntityModals } from "./useEntityModals";
import { useContentModals } from "./useContentModals";

export function useModalState(
  isReadOnly: boolean,
  showError: (msg: string) => void,
) {
  const readOnlyGuard = useCallback((): boolean => {
    if (isReadOnly) {
      showError(
        "This feature is for admin only. You are viewing in read-only mode.",
      );
      return true;
    }
    return false;
  }, [isReadOnly, showError]);

  const entities = useEntityModals(readOnlyGuard);
  const content = useContentModals(readOnlyGuard);

  return { ...entities, ...content };
}
