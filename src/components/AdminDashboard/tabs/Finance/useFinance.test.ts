import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { FinanceData } from "@/types/finance";

const list = vi.fn();
vi.mock("@/services/api/finance", () => ({ financeApi: { list: () => list() } }));

const { useFinance } = await import("./useFinance");

const ledger = (budgets: number, version: string | null = null): FinanceData => ({
  version,
  funds: [],
  txns: [],
  expected: [],
  budgets: Array.from({ length: budgets }, (_, i) => ({
    scope: "me" as const,
    createdAt: "",
    updatedAt: "",
    id: `b${i}`,
    kind: "budget" as const,
    month: "2026-11",
    netIncomeMinor: 0,
    lines: [],
  })),
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

describe("useFinance", () => {
  beforeEach(() => list.mockReset());

  it("stamps the time only on a successful load and marks a failed reload stale", async () => {
    list.mockRejectedValueOnce(new Error("Sign in again."));
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.updatedAt).toBeNull();
    expect(result.current.stale).toBe(false);

    list.mockResolvedValueOnce(ledger(1));
    await act(() => result.current.reload());
    const loadedAt = result.current.updatedAt;
    expect(loadedAt).toBeInstanceOf(Date);
    expect(result.current.stale).toBe(false);

    list.mockRejectedValueOnce(new Error("Network down."));
    await act(() => result.current.reload());
    expect(result.current.updatedAt).toBe(loadedAt);
    expect(result.current.stale).toBe(true);
    expect(result.current.data.budgets).toHaveLength(1);
  });

  it("doesn't count a refused change as a failed refresh", async () => {
    list.mockResolvedValue(ledger(0));
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.updatedAt).not.toBeNull());
    act(() => result.current.report(new Error("Restore it first."), "Couldn't delete it."));
    expect(result.current.error).toBe("Restore it first.");
    expect(result.current.stale).toBe(false);
  });

  it("sends each change the version on screen, and the next one the version after it", async () => {
    list.mockResolvedValueOnce(ledger(0, '"v1"'));
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loaded).toBe(true));

    const change = vi.fn().mockResolvedValue({});
    list.mockResolvedValueOnce(ledger(1, '"v2"'));
    await act(() => result.current.mutate(change));
    expect(change).toHaveBeenLastCalledWith('"v1"');

    list.mockResolvedValueOnce(ledger(2, '"v3"'));
    await act(() => result.current.mutate(change));
    expect(change).toHaveBeenLastCalledWith('"v2"');
  });

  it("forgets a row its change kept once the reload is on screen, so a later removal moves no focus", async () => {
    list.mockResolvedValue(ledger(0));
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const rows = document.createElement("ul");
    rows.innerHTML =
      '<li id="kept"><h3 data-row-name tabindex="-1">Car</h3></li>' +
      '<li><h3 data-row-name tabindex="-1" id="next">Rent</h3></li>';
    document.body.append(rows);
    const kept = rows.querySelector<HTMLElement>("#kept")!;
    try {
      // A change that leaves the row in its list, like an edit that keeps its kind.
      await act(() => result.current.mutate(async () => ({}), { row: kept }));
      expect(kept.isConnected).toBe(true);
      // Later the row goes for another reason, and focus with it.
      kept.remove();
      await act(() => result.current.reload());
      expect(document.activeElement).toBe(document.body);
    } finally {
      rows.remove();
    }
  });

  it("still moves focus off a removed row when a Refresh overtakes the change's reload", async () => {
    list.mockResolvedValue(ledger(0));
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    const rows = document.createElement("ul");
    rows.innerHTML =
      '<li id="gone"><h3 data-row-name tabindex="-1">Car</h3></li>' +
      '<li><h3 data-row-name tabindex="-1" id="next">Rent</h3></li>';
    document.body.append(rows);
    const gone = rows.querySelector<HTMLElement>("#gone")!;
    try {
      let answerChange!: (d: FinanceData) => void;
      let answerRefresh!: (d: FinanceData) => void;
      list
        .mockReturnValueOnce(new Promise<FinanceData>((r) => (answerChange = r)))
        .mockReturnValueOnce(new Promise<FinanceData>((r) => (answerRefresh = r)));
      let changing!: Promise<unknown>;
      act(() => {
        changing = result.current.mutate(async () => ({}), { row: gone });
      });
      // The first load, then the change's reload, then the Refresh.
      await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
      act(() => void result.current.reload());
      await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
      // The change's own reload answers first but was overtaken by the Refresh.
      gone.remove();
      await act(async () => {
        answerChange(ledger(1, '"v2"'));
        await changing;
      });
      await act(async () => answerRefresh(ledger(1, '"v2"')));
      await waitFor(() => expect(document.activeElement?.id).toBe("next"));
    } finally {
      rows.remove();
    }
  });

  it("keeps the newest ledger when an older reload answers last", async () => {
    list.mockResolvedValueOnce(ledger(0));
    const { result } = renderHook(() => useFinance());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const older = deferred<FinanceData>();
    const newer = deferred<FinanceData>();
    list.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    let first!: Promise<boolean>;
    let second!: Promise<boolean>;
    act(() => {
      first = result.current.reload();
      second = result.current.reload();
    });
    await act(async () => {
      newer.resolve(ledger(2));
      await second;
    });
    expect(result.current.loading).toBe(false);
    await act(async () => {
      older.resolve(ledger(1));
      await first;
    });
    expect(result.current.data.budgets).toHaveLength(2);
  });
});
