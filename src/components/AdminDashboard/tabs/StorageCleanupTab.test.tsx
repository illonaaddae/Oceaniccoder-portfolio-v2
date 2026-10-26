import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MediaFile } from "@/services/api/storage";

const UPLOADED_LOGO = vi.hoisted(
  () => "https://oceaniccodermedia.blob.core.windows.net/media/logo-file/logo-file.png",
);
const manageList = vi.fn();
const readPlatformLogoOverrides = vi.fn();
const readHeroImages = vi.fn();
const listMediaFiles = vi.fn();
const deleteImage = vi.fn();

vi.mock("@/services/api/dataApi", () => ({
  manageList: (...a: unknown[]) => manageList(...a),
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

function serveRows(rows: Rows) {
  const read = rowsFor(rows);
  manageList.mockImplementation(async (collection: string) => {
    const documents = await read(collection);
    return { total: documents.length, documents };
  });
}

async function renderTab() {
  render(<StorageCleanupTab theme="dark" />);
  await screen.findByText("orphan-file.png");
}

// "Delete <file name>"; the dialog's own button is just "Delete".
const DELETE_FILE = /^delete \S/i;
const deleteButton = () => screen.getByRole("button", { name: DELETE_FILE });
const enabledDeleteButtons = () =>
  screen
    .queryAllByRole("button", { name: DELETE_FILE })
    .filter((b) => !(b as HTMLButtonElement).disabled);
const scanAlert = () => screen.queryByRole("alert");

beforeEach(() => {
  manageList.mockReset();
  readPlatformLogoOverrides.mockReset();
  readPlatformLogoOverrides.mockResolvedValue({});
  readHeroImages.mockReset();
  readHeroImages.mockResolvedValue({});
  deleteImage.mockReset();
  listMediaFiles.mockReset();
  listMediaFiles.mockResolvedValue(FILES);
});

describe("StorageCleanupTab", () => {
  it("reads every collection through /api/manage", async () => {
    serveRows({ projects: [PROJECT] });
    await renderTab();

    expect(manageList).toHaveBeenCalledWith("projects");
    expect(manageList).toHaveBeenCalledWith("testimonials");
    // No limit: every row counts, or a file used by row 501 looks orphaned.
    for (const call of manageList.mock.calls) expect(call).toHaveLength(1);

    expect(screen.getByText("In use")).toBeInTheDocument();
    expect(deleteButton()).toBeEnabled();
    expect(scanAlert()).not.toBeInTheDocument();
  });

  it("deletes an orphan after confirmation when every collection was read", async () => {
    serveRows({ projects: [PROJECT] });
    deleteImage.mockResolvedValue(undefined);
    await renderTab();

    await userEvent.click(deleteButton());
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(deleteImage).toHaveBeenCalledWith("orphan-file");
  });

  it("blocks delete when a collection can't be read", async () => {
    // The project row that uses live-file can't be read, so live-file looks orphaned.
    serveRows({ projects: new Error("Forbidden") });
    await renderTab();

    const alert = scanAlert();
    expect(alert).toBeInTheDocument();
    expect(within(alert as HTMLElement).getByText(/deleting is turned off/i)).toBeInTheDocument();
    expect(within(alert as HTMLElement).getByText(/projects: Forbidden/)).toBeInTheDocument();

    const buttons = screen.getAllByRole("button", { name: DELETE_FILE });
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    expect(deleteImage).not.toHaveBeenCalled();
  });

  describe("platform logo overrides", () => {
    const LOGO = media("logo-file");

    it("counts an override's file as in use even when the overrides load last", async () => {
      serveRows({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, LOGO]);
      // Resolves after the collections and the media list.
      readPlatformLogoOverrides.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ AWS: LOGO.url }), 20)),
      );
      await renderTab();

      expect(screen.getAllByText("In use")).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: DELETE_FILE })).toHaveLength(1);
      expect(screen.getByRole("img", { name: "AWS" })).toHaveAttribute("src", LOGO.url);
    });

    it("keeps the bundled logo in use when an override is empty", async () => {
      const bundledAws = {
        ...media("6a08dac800096013ea70"),
        url: `${BASE}/6a08dac800096013ea70/pinclipart-com-welders-clipart-1637044.webp`,
      };
      serveRows({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, bundledAws]);
      readPlatformLogoOverrides.mockResolvedValue({ AWS: "" });
      await renderTab();

      expect(screen.getAllByText("In use")).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: DELETE_FILE })).toHaveLength(1);
      expect(screen.getByRole("img", { name: "AWS" })).toHaveAttribute("src", bundledAws.url);
    });

    it("keeps a replaced logo in use when an older scan finishes last", async () => {
      serveRows({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, LOGO]);
      // The scan on mount reads the overrides from before the replacement and
      // is held until the scan the replacement starts has finished.
      let finishFirstRead: (overrides: Record<string, string>) => void = () => {};
      readPlatformLogoOverrides
        .mockImplementationOnce(() => new Promise((resolve) => (finishFirstRead = resolve)))
        .mockResolvedValue({ AWS: LOGO.url });
      render(<StorageCleanupTab theme="dark" />);

      const awsTile = screen.getByText("AWS").closest(".rounded-xl") as HTMLElement;
      await userEvent.click(within(awsTile).getByRole("button", { name: /replace logo/i }));
      await userEvent.click(screen.getByRole("button", { name: "Upload AWS logo" }));
      await screen.findByText(/AWS logo updated/);
      await waitFor(() => expect(screen.getAllByText("In use")).toHaveLength(2));

      await act(async () => {
        finishFirstRead({});
        // One macrotask lets the older scan's whole promise chain settle.
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(screen.getAllByText("In use")).toHaveLength(2);
      expect(screen.getAllByRole("button", { name: DELETE_FILE })).toHaveLength(1);
    });

    it("blocks delete when the overrides can't be read", async () => {
      serveRows({ projects: [PROJECT] });
      listMediaFiles.mockResolvedValue([...FILES, LOGO]);
      readPlatformLogoOverrides.mockRejectedValue(new Error("Unauthorized"));
      await renderTab();

      expect(
        within(scanAlert() as HTMLElement).getByText(/platform logos: Unauthorized/),
      ).toBeInTheDocument();
      const buttons = screen.getAllByRole("button", { name: DELETE_FILE });
      expect(buttons).toHaveLength(2);
      for (const button of buttons) expect(button).toBeDisabled();
    });
  });

  it("lists no files from the earlier scan after a refresh fails", async () => {
    serveRows({ projects: [PROJECT] });
    await renderTab();
    expect(screen.getByText("live-file.png")).toBeInTheDocument();

    listMediaFiles.mockRejectedValue(new Error("Media list failed"));
    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText(/Media list failed/);

    expect(screen.queryByText("live-file.png")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "In-Use Files (0)" })).toBeInTheDocument();
    expect(screen.getByText("No scan results.")).toBeInTheDocument();
  });

  it("shows no deletable files when a refresh can't list the media after a failed scan", async () => {
    // Scan 1: projects fails, so live-file is listed as an orphan with delete off.
    serveRows({ projects: new Error("Forbidden") });
    await renderTab();
    expect(enabledDeleteButtons()).toHaveLength(0);

    // Scan 2: every collection reads, but the media list fails.
    serveRows({ projects: [PROJECT] });
    listMediaFiles.mockRejectedValue(new Error("Media list failed"));
    await userEvent.click(screen.getByRole("button", { name: /refresh/i }));
    // Announced once, by the error banner; the scan warning has been cleared.
    await screen.findByText(/Media list failed/);
    expect(screen.getByRole("alert")).toHaveTextContent("Media list failed");
    expect(screen.getByText(/scan did not finish/i)).not.toHaveAttribute("aria-live");

    expect(screen.queryByText("live-file.png")).not.toBeInTheDocument();
    expect(enabledDeleteButtons()).toHaveLength(0);
  });

  it("counts an image the site's code uses as in use", async () => {
    // IMAGES.profile, the default hero and sidebar photo; no row points at it.
    const profile = media("69444ceb001c1eda1331");
    serveRows({ projects: [PROJECT] });
    listMediaFiles.mockResolvedValue([...FILES, profile]);
    await renderTab();

    expect(screen.getAllByText("In use")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: DELETE_FILE })).toHaveLength(1);
  });

  describe("accessibility", () => {
    it("names each delete button after its file", async () => {
      serveRows({ projects: [PROJECT] });
      await renderTab();

      expect(screen.getByRole("button", { name: "Delete orphan-file.png" })).toBeEnabled();
    });

    it("gives a blocked delete button its reason", async () => {
      serveRows({ projects: new Error("Forbidden") });
      await renderTab();

      for (const button of screen.getAllByRole("button", { name: DELETE_FILE })) {
        expect(button).toHaveAccessibleDescription(
          "Deleting is off because some collections could not be scanned.",
        );
      }
      const orphans = screen.getByRole("heading", { name: /orphaned files/i }).parentElement;
      expect(within(orphans as HTMLElement).getByText(/deleting is off/i)).toBeInTheDocument();
    });

    it("announces the scan in a status region", async () => {
      serveRows({ projects: [PROJECT] });
      let finishList: (files: MediaFile[]) => void = () => {};
      listMediaFiles.mockImplementationOnce(() => new Promise((resolve) => (finishList = resolve)));
      render(<StorageCleanupTab theme="dark" />);

      expect(await screen.findByRole("status")).toHaveTextContent("Scanning…");
      await act(async () => finishList(FILES));
      expect(screen.getByRole("status")).toHaveTextContent("Scan finished: 1 orphaned file");
    });

    it("keeps the finished count as scanned after a delete", async () => {
      serveRows({ projects: [PROJECT] });
      deleteImage.mockResolvedValue(undefined);
      await renderTab();

      await userEvent.click(deleteButton());
      await userEvent.click(screen.getByRole("button", { name: "Delete" }));
      await screen.findByText(/deleted successfully/);

      // A changing count would be announced again as if a new scan finished.
      expect(screen.getByRole("status")).toHaveTextContent("Scan finished: 1 orphaned file");
    });

    it("announces each partial scan in the status region", async () => {
      serveRows({ projects: new Error("Forbidden") });
      await renderTab();

      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("Scan finished. 1 collection could not be read.");

      serveRows({ projects: new Error("Forbidden"), gallery: new Error("Forbidden") });
      await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
      await waitFor(() =>
        expect(status).toHaveTextContent("Scan finished. 2 collections could not be read."),
      );
    });

    it("keeps keyboard focus on Refresh while it scans and ignores repeat presses", async () => {
      serveRows({ projects: [PROJECT] });
      await renderTab();
      let finishList: (files: MediaFile[]) => void = () => {};
      listMediaFiles.mockImplementation(() => new Promise((resolve) => (finishList = resolve)));

      const refresh = screen.getByRole("button", { name: /refresh/i });
      refresh.focus();
      await userEvent.keyboard("{Enter}");

      // Only the icon spins; the status region is what says "Scanning…".
      expect(refresh).toHaveTextContent("Refresh");
      expect(refresh).toHaveAccessibleName("Refresh");
      expect(refresh).toHaveAttribute("aria-disabled", "true");
      expect(refresh).toHaveFocus();
      await userEvent.keyboard("{Enter}");
      expect(listMediaFiles).toHaveBeenCalledTimes(2);

      await act(async () => finishList(FILES));
      expect(refresh).toHaveAttribute("aria-disabled", "false");
      expect(refresh).toHaveFocus();
    });

    it("shows a scanning state in the header instead of zero counts", async () => {
      serveRows({ projects: [PROJECT] });
      listMediaFiles.mockImplementationOnce(() => new Promise(() => {}));
      render(<StorageCleanupTab theme="dark" />);

      expect(screen.getByText("Scanning storage…")).toBeInTheDocument();
      expect(screen.queryByText(/0 files/)).not.toBeInTheDocument();
    });
  });

  describe("media referenced outside the plain URL fields", () => {
    const fileOnlyUsedBy = async (serve: () => void) => {
      serve();
      await renderTab();
      // live-file is used only by the source under test, never by a project.
      expect(screen.getByText("In use")).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: DELETE_FILE })).toHaveLength(1);
      expect(deleteButton()).toBeEnabled();
    };
    const LIVE_URL = PROJECT.image;

    it("counts a hero image as in use", async () => {
      await fileOnlyUsedBy(() => {
        serveRows({});
        readHeroImages.mockResolvedValue({ light: "", dark: LIVE_URL });
      });
    });

    it("blocks delete when the hero images can't be read", async () => {
      serveRows({ projects: [PROJECT] });
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
      ["a relative path", "![Image](/media/live-file/live-file.png)"],
      ["an upper-case scheme", `![Image](${LIVE_URL.replace("https://", "HTTPS://")})`],
      ["a scheme-less URL", `![Image](${LIVE_URL.replace("https:", "")})`],
    ])("counts an image in a blog post body as in use: %s", async (_name, content) => {
      await fileOnlyUsedBy(() => serveRows({ blog_posts: [{ $id: "b1", content }] }));
    });

    it("counts a project's demo video as in use", async () => {
      await fileOnlyUsedBy(() =>
        serveRows({ project_videos: [{ $id: "v1", projectId: "p1", demoVideoUrl: LIVE_URL }] }),
      );
    });

    it.each(["blog_posts", "project_videos"])(
      "blocks delete when %s can't be read",
      async (collection) => {
        serveRows({ projects: [PROJECT], [collection]: new Error("Forbidden") });
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
