import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MediaFile } from "@/services/api/storage";

const mode = vi.hoisted(() => ({ usesCosmos: false }));
const manageList = vi.fn();
const listAllDocuments = vi.fn();
const readPlatformLogoOverrides = vi.fn();
const listMediaFiles = vi.fn();
const deleteImage = vi.fn();

vi.mock("@/services/api/dataApi", () => ({
  get usesCosmos() {
    return mode.usesCosmos;
  },
  manageList: (...a: unknown[]) => manageList(...a),
}));
vi.mock("@/services/api/listAll", () => ({
  LIST_ALL_CAP: 2000,
  listAllDocuments: (...a: unknown[]) => listAllDocuments(...a),
}));
vi.mock("@/services/api/storage", () => ({
  listMediaFiles: () => listMediaFiles(),
  deleteImage: (...a: unknown[]) => deleteImage(...a),
}));
vi.mock("@/services/api/settings", () => ({
  readPlatformLogoOverrides: () => readPlatformLogoOverrides(),
  setPlatformLogoUrl: vi.fn(),
}));
vi.mock("@/components/AdminDashboard/ImageUpload", () => ({ ImageUpload: () => null }));

import { StorageCleanupTab } from "./StorageCleanupTab";

const BASE = "https://oceaniccodermedia.blob.core.windows.net/media";
const media = (fileId: string): MediaFile => ({
  fileId,
  name: `${fileId}.png`,
  url: `${BASE}/${fileId}/${fileId}.png`,
  size: 1024,
  variantBytes: 0,
  contentType: "image/png",
});

// One live image (used by a project) and one file nothing points at.
const FILES = [media("live-file"), media("orphan-file")];
const PROJECT = { $id: "p1", image: `${BASE}/live-file/live-file.png` };

/** Rows per collection; a collection mapped to an Error fails its read. */
type Rows = Record<string, Record<string, unknown>[] | Error>;
const rowsFor = (rows: Rows) => async (collection: string) => {
  const value = rows[collection] ?? [];
  if (value instanceof Error) throw value;
  return value;
};

function serveCosmos(rows: Rows) {
  mode.usesCosmos = true;
  const read = rowsFor(rows);
  manageList.mockImplementation(async (collection: string) => {
    const documents = await read(collection);
    return { total: documents.length, documents };
  });
}

function serveAppwrite(rows: Rows) {
  mode.usesCosmos = false;
  const read = rowsFor(rows);
  listAllDocuments.mockImplementation(read);
}

async function renderTab() {
  render(<StorageCleanupTab theme="dark" />);
  await screen.findByText("orphan-file.png");
}

const deleteButton = () => screen.getByRole("button", { name: /delete file/i });
const enabledDeleteButtons = () =>
  screen
    .queryAllByRole("button", { name: /delete file/i })
    .filter((b) => !(b as HTMLButtonElement).disabled);
const scanAlert = () => screen.queryByRole("alert");

beforeEach(() => {
  manageList.mockReset();
  listAllDocuments.mockReset();
  readPlatformLogoOverrides.mockReset();
  readPlatformLogoOverrides.mockResolvedValue({});
  deleteImage.mockReset();
  listMediaFiles.mockReset();
  listMediaFiles.mockResolvedValue(FILES);
});

describe("StorageCleanupTab", () => {
  it("reads every collection through /api/manage in Cosmos mode", async () => {
    serveCosmos({ projects: [PROJECT] });
    await renderTab();

    expect(listAllDocuments).not.toHaveBeenCalled();
    expect(manageList).toHaveBeenCalledWith("projects");
    expect(manageList).toHaveBeenCalledWith("testimonials");
    // No limit: every row counts, or a file used by row 501 looks orphaned.
    for (const call of manageList.mock.calls) expect(call).toHaveLength(1);

    expect(screen.getByText("In use")).toBeInTheDocument();
    expect(deleteButton()).toBeEnabled();
    expect(scanAlert()).not.toBeInTheDocument();
  });

  it("deletes an orphan after confirmation when every collection was read", async () => {
    serveCosmos({ projects: [PROJECT] });
    deleteImage.mockResolvedValue(undefined);
    await renderTab();

    await userEvent.click(deleteButton());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteImage).toHaveBeenCalledWith("orphan-file");
  });

  it.each([
    ["Cosmos", serveCosmos],
    ["Appwrite", serveAppwrite],
  ])("blocks delete in %s mode when a collection can't be read", async (_name, serve) => {
    // The project row that uses live-file can't be read, so live-file looks orphaned.
    serve({ projects: new Error("Forbidden") });
    await renderTab();

    const alert = scanAlert();
    expect(alert).toBeInTheDocument();
    expect(within(alert as HTMLElement).getByText(/deleting is turned off/i)).toBeInTheDocument();
    expect(within(alert as HTMLElement).getByText(/projects: Forbidden/)).toBeInTheDocument();

    const buttons = screen.getAllByRole("button", { name: /delete file/i });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(deleteImage).not.toHaveBeenCalled();
  });

  it("reads every Appwrite row in Appwrite mode, past the old 500-row page", async () => {
    const filler = Array.from({ length: 600 }, (_, i) => ({ $id: `p${i}`, image: "" }));
    serveAppwrite({ projects: [...filler, PROJECT] });
    await renderTab();

    expect(manageList).not.toHaveBeenCalled();
    expect(listAllDocuments).toHaveBeenCalledWith("projects");
    expect(screen.getByText("In use")).toBeInTheDocument();
    expect(deleteButton()).toBeEnabled();
  });

  it("blocks delete when an Appwrite collection reaches the row cap", async () => {
    const full = Array.from({ length: 2000 }, (_, i) => ({ $id: `p${i}`, image: "" }));
    serveAppwrite({ projects: full });
    await renderTab();

    expect(
      within(scanAlert() as HTMLElement).getByText(/projects: more than 1999 rows/),
    ).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /delete file/i })) {
      expect(button).toBeDisabled();
    }
  });

  describe("platform logo overrides", () => {
    const LOGO = media("logo-file");

    it("counts an override's file as in use even when the overrides load last", async () => {
      serveCosmos({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, LOGO]);
      // Resolves after the collections and the media list.
      readPlatformLogoOverrides.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ AWS: LOGO.url }), 20)),
      );
      await renderTab();

      expect(screen.getAllByText("In use")).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /delete file/i })).toHaveLength(1);
      expect(screen.getByRole("img", { name: "AWS" })).toHaveAttribute("src", LOGO.url);
    });

    it("blocks delete when the overrides can't be read", async () => {
      serveCosmos({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, LOGO]);
      readPlatformLogoOverrides.mockRejectedValue(new Error("Unauthorized"));
      await renderTab();

      expect(
        within(scanAlert() as HTMLElement).getByText(/platform logos: Unauthorized/),
      ).toBeInTheDocument();
      const buttons = screen.getAllByRole("button", { name: /delete file/i });
      expect(buttons).toHaveLength(2);
      for (const button of buttons) expect(button).toBeDisabled();
    });
  });

  it("shows no deletable files when a refresh can't list the media after a failed scan", async () => {
    // Scan 1: projects fails, so live-file is listed as an orphan with delete off.
    serveCosmos({ projects: new Error("Forbidden") });
    await renderTab();
    expect(enabledDeleteButtons()).toHaveLength(0);

    // Scan 2: every collection reads, but the media list fails.
    serveCosmos({ projects: [PROJECT] });
    listMediaFiles.mockRejectedValue(new Error("Media list failed"));
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    await screen.findByText(/Media list failed/);

    expect(screen.queryByText("live-file.png")).not.toBeInTheDocument();
    expect(enabledDeleteButtons()).toHaveLength(0);
  });
});
