import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MediaFile } from "@/services/api/storage";

const mode = vi.hoisted(() => ({ usesCosmos: false }));
const manageList = vi.fn();
const listDocuments = vi.fn();
const listMediaFiles = vi.fn();
const deleteImage = vi.fn();

vi.mock("@/services/api/dataApi", () => ({
  get usesCosmos() {
    return mode.usesCosmos;
  },
  manageList: (...a: unknown[]) => manageList(...a),
}));
vi.mock("@/lib/appwrite", () => ({
  DATABASE_ID: "db",
  databases: { listDocuments: (...a: unknown[]) => listDocuments(...a) },
}));
vi.mock("@/services/api/storage", () => ({
  listMediaFiles: () => listMediaFiles(),
  deleteImage: (...a: unknown[]) => deleteImage(...a),
}));
vi.mock("@/services/api/settings", () => ({
  getPlatformLogoOverrides: () => Promise.resolve({}),
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
  listDocuments.mockImplementation(async (_db: string, collection: string) => {
    const documents = await read(collection);
    return { total: documents.length, documents };
  });
}

async function renderTab() {
  render(<StorageCleanupTab theme="dark" />);
  await screen.findByText("orphan-file.png");
}

const deleteButton = () => screen.getByRole("button", { name: /delete file/i });
const scanAlert = () => screen.queryByRole("alert");

beforeEach(() => {
  manageList.mockReset();
  listDocuments.mockReset();
  deleteImage.mockReset();
  listMediaFiles.mockReset();
  listMediaFiles.mockResolvedValue(FILES);
});

describe("StorageCleanupTab", () => {
  it("reads every collection through /api/manage in Cosmos mode", async () => {
    serveCosmos({ projects: [PROJECT] });
    await renderTab();

    expect(listDocuments).not.toHaveBeenCalled();
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

  it("reads Appwrite and allows delete in Appwrite mode when every read succeeds", async () => {
    serveAppwrite({ projects: [PROJECT] });
    await renderTab();

    expect(manageList).not.toHaveBeenCalled();
    expect(listDocuments).toHaveBeenCalledWith("db", "projects", expect.any(Array));
    expect(screen.getByText("In use")).toBeInTheDocument();
    expect(deleteButton()).toBeEnabled();
  });
});
