import { useCallback, useEffect, useRef, useState } from "react";
import { cvApi } from "@/services/api/cv";
import type { CvData } from "@/types/cv";

const EMPTY: CvData = {
  profile: null,
  entries: [],
  sources: { education: [], journey: [], projects: [], certifications: [] },
  sections: { education: [], experience: [], projects: [], certifications: [] },
  warnings: [],
  version: null,
};

/**
 * The CV store and the site items it links to, loaded once and reloaded after
 * every change, so what is on screen is what the server stored. Only the
 * latest reload lands. The same shape as useFinance.
 */
export function useCv() {
  const [data, setData] = useState<CvData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  // Set only by a failed load, so "Couldn't refresh" never shows for a refused change.
  const [loadFailed, setLoadFailed] = useState(false);
  const latest = useRef(0);
  const [announcement, setAnnouncement] = useState({ text: "", n: 0 });
  const announce = useCallback(
    (text: string) => setAnnouncement((a) => ({ text, n: a.n + 1 })),
    [],
  );

  /** Resolves true when this load landed and succeeded. */
  const reload = useCallback(async (): Promise<boolean> => {
    const request = ++latest.current;
    setLoading(true);
    try {
      const next = await cvApi.load();
      if (request !== latest.current) return false;
      setData(next);
      setLoaded(true);
      setError(null);
      setLoadFailed(false);
      setUpdatedAt(new Date());
      return true;
    } catch (err) {
      if (request !== latest.current) return false;
      setError(err instanceof Error ? err.message : "Couldn't load your CV.");
      setLoadFailed(true);
      return false;
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, []);

  // A row a change may take off the screen, and where focus goes if it does.
  const leaving = useRef<{ row: HTMLElement; next: (HTMLElement | null)[] } | null>(null);
  useEffect(() => {
    const pending = leaving.current;
    if (!pending || pending.row.isConnected) return;
    leaving.current = null;
    if (document.activeElement && document.activeElement !== document.body) return;
    pending.next.find((el) => el?.isConnected)?.focus();
  });

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Runs a change, then reloads. `change` gets the store version on screen,
   * for the server to refuse the write if the store has moved on. Throws so
   * the caller can show the error.
   *
   * `row` is a row the change can take away (delete): if it goes, focus moves
   * to the next row's name, else the previous row's, else the list, else the
   * view. Names carry data-row-name and lists data-row-list.
   *
   * `basedOn` is the version an edit form opened on, so a save after Refresh
   * can't put the form's old values over a newer edit.
   */
  const version = data.version;
  const mutate = useCallback(
    async <T>(
      change: (version: string | null) => Promise<T>,
      { row, basedOn }: { row?: HTMLElement | null; basedOn?: string | null } = {},
    ): Promise<T> => {
      const nameIn = (el: Element | null | undefined) =>
        el?.querySelector<HTMLElement>("[data-row-name]") ?? null;
      leaving.current = row
        ? {
            row,
            next: [
              nameIn(row.nextElementSibling),
              nameIn(row.previousElementSibling),
              row.closest<HTMLElement>("[data-row-list]"),
              row.closest<HTMLElement>("[data-cv-view]"),
            ],
          }
        : null;
      let result: T;
      try {
        result = await change(basedOn === undefined ? version : basedOn);
      } catch (err) {
        leaving.current = null;
        throw err;
      }
      await reload();
      return result;
    },
    [reload, version],
  );

  return {
    data,
    loading,
    loaded,
    error,
    updatedAt,
    /** The last load failed, so what is on screen is from `updatedAt`. */
    stale: loadFailed && updatedAt !== null,
    announcement,
    announce,
    clearError: () => setError(null),
    reload,
    mutate,
  };
}

export type CvState = ReturnType<typeof useCv>;
