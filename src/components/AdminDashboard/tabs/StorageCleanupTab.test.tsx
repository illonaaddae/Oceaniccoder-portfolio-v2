import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MediaFile } from "@/services/api/storage";

const mode = vi.hoisted(() => ({ usesCosmos: false }));
const UPLOADED_LOGO = vi.hoisted(
  () => "https://oceaniccodermedia.blob.core.windows.net/media/logo-file/logo-file.png",
);
const manageList = vi.fn();
const listAllDocuments = vi.fn();
const readPlatformLogoOverrides = vi.fn();
const readHeroImages = vi.fn();
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
  readHeroImages: () => readHeroImages(),
  setPlatformLogoUrl: vi.fn(),
}));
// Stands in for a finished upload: one click hands back the uploaded URL.
vi.mock("@/components/AdminDashboard/ImageUpload", () => ({
  ImageUpload: ({ onChange, label }: { onChange: (url: string) => void; label: string }) => (
    <button type="button" onClick={() => onChange(UPLOADED_LOGO)}>
      Upload {label}
    </button>
  ),
}));

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
  readHeroImages.mockReset();
  readHeroImages.mockResolvedValue({});
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

    it("keeps the bundled logo in use when an override is empty", async () => {
      const bundledAws = {
        ...media("6a08dac800096013ea70"),
        url: `${BASE}/6a08dac800096013ea70/pinclipart-com-welders-clipart-1637044.webp`,
      };
      serveCosmos({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, bundledAws]);
      readPlatformLogoOverrides.mockResolvedValue({ AWS: "" });
      await renderTab();

      expect(screen.getAllByText("In use")).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /delete file/i })).toHaveLength(1);
      expect(screen.getByRole("img", { name: "AWS" })).toHaveAttribute("src", bundledAws.url);
    });

    it("keeps a replaced logo in use when an older scan finishes last", async () => {
      serveCosmos({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, LOGO]);
      // The scan on mount reads the overrides from before the replacement, slowly.
      readPlatformLogoOverrides
        .mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({}), 100)))
        .mockResolvedValue({ AWS: LOGO.url });
      render(<StorageCleanupTab theme="dark" />);

      const awsTile = screen.getByText("AWS").closest(".rounded-xl") as HTMLElement;
      await userEvent.click(within(awsTile).getByRole("button", { name: /replace logo/i }));
      await userEvent.click(screen.getByRole("button", { name: "Upload AWS logo" }));
      await screen.findByText(/AWS logo updated/);
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(screen.getAllByText("In use")).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: /delete file/i })).toHaveLength(1);
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

  it("counts an image the site's code uses as in use", async () => {
    // IMAGES.profile, the default hero and sidebar photo; no row points at it.
    const profile = media("69444ceb001c1eda1331");
    serveCosmos({ projects: [PROJECT] });
    listMediaFiles.mockResolvedValue([...FILES, profile]);
    await renderTab();

    expect(screen.getAllByText("In use")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /delete file/i })).toHaveLength(1);
  });

  describe("media referenced outside the plain URL fields", () => {
    const fileOnlyUsedBy = async (serve: () => void) => {
      serve();
      await renderTab();
      // live-file is used only by the source under test, never by a project.
      expect(screen.getByText("In use")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /delete file/i })).toHaveLength(1);
      expect(deleteButton()).toBeEnabled();
    };
    const LIVE_URL = PROJECT.image;

    it("counts a hero image as in use", async () => {
      await fileOnlyUsedBy(() => {
        serveCosmos({});
        readHeroImages.mockResolvedValue({ light: "", dark: LIVE_URL });
      });
    });

    it("blocks delete when the hero images can't be read", async () => {
      serveCosmos({ projects: [PROJECT] });
      readHeroImages.mockRejectedValue(new Error("hero_images setting is not an object of URLs"));
      await renderTab();

      expect(
        within(scanAlert() as HTMLElement).getByText(/hero images: hero_images setting/),
      ).toBeInTheDocument();
      expect(enabledDeleteButtons()).toHaveLength(0);
    });

    it.each([
      ["markdown inserted by the editor", `Intro\n![Image](${LIVE_URL})\nMore`],
      ["an HTML img tag", `<p><img src="${LIVE_URL}" alt="x"></p>`],
      ["a bare URL", `See ${LIVE_URL}.`],
    ])("counts an image in a blog post body as in use: %s", async (_name, content) => {
      await fileOnlyUsedBy(() => serveCosmos({ blog_posts: [{ $id: "b1", content }] }));
    });

    it("counts a project's demo video as in use", async () => {
      await fileOnlyUsedBy(() =>
        serveCosmos({ project_videos: [{ $id: "v1", projectId: "p1", demoVideoUrl: LIVE_URL }] }),
      );
    });

    it.each(["blog_posts", "project_videos"])(
      "blocks delete when %s can't be read",
      async (collection) => {
        serveCosmos({ projects: [PROJECT], [collection]: new Error("Forbidden") });
        await renderTab();

        expect(
          within(scanAlert() as HTMLElement).getByText(`${collection}: Forbidden`, {
            exact: false,
          }),
        ).toBeInTheDocument();
        expect(enabledDeleteButtons()).toHaveLength(0);
      },
    );
  });
});
