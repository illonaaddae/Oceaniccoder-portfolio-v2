// Made-up people and organisations only.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CvData, CvEntry, CvProfile } from "@/types/cv";
import { ConfirmProvider } from "../../ConfirmContext";

const load = vi.fn();
const setShown = vi.fn();
const reorder = vi.fn();
const saveEntry = vi.fn();
const saveProfile = vi.fn();
const deleteEntry = vi.fn();
vi.mock("@/services/api/cv", () => ({
  cvApi: {
    load: () => load(),
    setShown: (...args: unknown[]) => setShown(...args),
    reorder: (...args: unknown[]) => reorder(...args),
    saveEntry: (...args: unknown[]) => saveEntry(...args),
    saveProfile: (...args: unknown[]) => saveProfile(...args),
    deleteEntry: (...args: unknown[]) => deleteEntry(...args),
  },
}));

const { default: CvTab } = await import("./CvTab");

const stamp = { scope: "me" as const, createdAt: "2026-01-01", updatedAt: "2026-01-01" };

function entry(patch: Partial<CvEntry> & Pick<CvEntry, "id" | "section">): CvEntry {
  return {
    ...stamp,
    kind: "entry",
    source: null,
    show: true,
    order: 10,
    fields: {},
    approved: null,
    draft: null,
    sourceNotes: "",
    ...patch,
  };
}

const PROFILE: CvProfile = {
  ...stamp,
  id: "profile",
  kind: "profile",
  header: {
    name: "Ama Mensah",
    title: "Software Engineer",
    lines: ["Kumasi, Ghana", "ama.mensah@example.com"],
    links: [{ label: "Portfolio Website", url: "https://ama-mensah.example.com/" }],
  },
  awards: [{ id: "a1", title: "Dean's List", issuer: "Kumasi Tech", year: "2024" }],
  coCurricular: [],
  skills: [{ id: "s1", label: "Languages", items: "TypeScript, Python" }],
  references: { mode: "on-request", text: "Available upon request" },
  footnotes: [],
};

const HARBOUR = entry({
  id: "entry.projects.cv-1",
  section: "projects",
  fields: { title: "Harbour Tracker" },
  approved: { roleLine: "Solo project", bullets: ["Built a tide alert app."], approvedAt: "x" },
  sourceNotes: "A tide alert app.",
});
const GONE_CERT = entry({
  id: "entry.certifications.c9",
  section: "certifications",
  source: { collection: "certifications", id: "c9" },
  fields: { title: "Old Cloud Badge" },
});

const DATA: CvData = {
  profile: PROFILE,
  entries: [HARBOUR, GONE_CERT],
  sources: {
    education: [],
    journey: [
      {
        $id: "j1",
        role: "Software Engineer",
        company: "Brightpath Software",
        period: "2025 to now",
        achievements: ["Built scheduling features."],
      },
    ],
    projects: [{ $id: "p1", title: "Clinic Scheduler" }],
    certifications: [],
  },
  sections: {
    education: [],
    experience: [{ id: "entry.experience.j1", show: true, orphan: false }],
    projects: [
      { id: "entry.projects.p1", show: true, orphan: false },
      { id: "entry.projects.cv-1", show: true, orphan: false },
    ],
    certifications: [{ id: "entry.certifications.c9", show: true, orphan: true }],
  },
  warnings: [],
  version: '"v1"',
};

function renderTab() {
  return render(
    <ConfirmProvider>
      <CvTab theme="light" />
    </ConfirmProvider>,
  );
}

const region = (name: string) => screen.findByRole("region", { name });
const row = (list: HTMLElement, name: string) =>
  within(list).getByRole("listitem", { name: new RegExp(name) });

beforeEach(() => {
  for (const fn of [setShown, reorder, saveEntry, saveProfile, deleteEntry])
    fn.mockReset().mockResolvedValue({});
  load.mockReset().mockResolvedValue(DATA);
});

describe("CvTab sections", () => {
  it("lists site and CV-only items in CV order, with what each one needs", async () => {
    renderTab();
    const projects = await region("Projects and research");
    const names = within(projects)
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(names).toEqual(["Clinic Scheduler", "Harbour Tracker"]);

    const clinic = row(projects, "Clinic Scheduler");
    expect(within(clinic).getByText("Site")).toBeInTheDocument();
    expect(within(clinic).getByText("Waiting for approval")).toBeInTheDocument();
    const harbour = row(projects, "Harbour Tracker");
    expect(within(harbour).getByText("CV only")).toBeInTheDocument();
    expect(within(harbour).queryByText("Waiting for approval")).toBeNull();

    // A live site item can only be hidden; a CV-only one can be deleted.
    expect(within(clinic).queryByRole("button", { name: /Delete/ })).toBeNull();
    expect(within(harbour).getByRole("button", { name: "Delete Harbour Tracker" })).toBeVisible();

    const certs = await region("Certifications");
    const gone = row(certs, "Old Cloud Badge");
    expect(within(gone).getByText("Site item deleted")).toBeInTheDocument();
    expect(within(gone).queryByRole("switch")).toBeNull();

    // The profile lists sit between the entry sections, in CV order.
    expect(within(await region("Achievements and awards")).getByText("Dean's List")).toBeVisible();
    expect(within(await region("Skills")).getByText("TypeScript, Python")).toBeVisible();
  });

  it("hides an item with the loaded version and reloads", async () => {
    renderTab();
    const toggle = await screen.findByRole("switch", { name: "Show on CV: Brightpath Software" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await userEvent.click(toggle);
    expect(setShown).toHaveBeenCalledWith("entry.experience.j1", false, '"v1"');
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Brightpath Software hidden from the CV")).toBeInTheDocument();
  });

  it("moves an item down by sending the whole section in its new order", async () => {
    renderTab();
    const projects = await region("Projects and research");
    expect(
      within(projects).getByRole("button", { name: "Move Clinic Scheduler up" }),
    ).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(
      within(projects).getByRole("button", { name: "Move Clinic Scheduler down" }),
    );
    expect(reorder).toHaveBeenCalledWith(
      "projects",
      ["entry.projects.cv-1", "entry.projects.p1"],
      '"v1"',
    );
  });

  it("saves approved text written by hand for a site job, keeping it shown", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Edit Brightpath Software" }));
    const form = screen.getByRole("form", { name: "Edit Brightpath Software" });
    // The site's value shows as a hint in an empty override.
    expect(within(form).getByLabelText("Organisation")).toHaveAttribute(
      "placeholder",
      "Brightpath Software",
    );
    await userEvent.type(within(form).getByLabelText("Role line"), "Software Engineer (Contract)");
    await userEvent.type(
      within(form).getByLabelText("Bullets"),
      "Built bookings.{enter}{enter}Ran demos.",
    );
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));

    expect(saveEntry).toHaveBeenCalledWith(
      {
        section: "experience",
        source: { collection: "journey", id: "j1" },
        show: true,
        fields: { org: "", location: "", title: "", period: "" },
        approved: {
          roleLine: "Software Engineer (Contract)",
          bullets: ["Built bookings.", "Ran demos."],
        },
      },
      '"v1"',
    );
    // Focus goes back to the button that opened the form.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Edit Brightpath Software" })).toHaveFocus(),
    );
  });

  it("refuses a role line with no bullets before calling the server", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Edit Brightpath Software" }));
    const form = screen.getByRole("form", { name: "Edit Brightpath Software" });
    await userEvent.type(within(form).getByLabelText("Role line"), "Lead");
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));
    expect(within(form).getByRole("alert")).toHaveTextContent("Add at least one bullet");
    expect(within(form).getByLabelText("Bullets")).toHaveFocus();
    expect(saveEntry).not.toHaveBeenCalled();
  });

  it("adds a CV-only project with its drafting notes", async () => {
    renderTab();
    await userEvent.click(
      await screen.findByRole("button", { name: "Add to Projects and research" }),
    );
    const form = screen.getByRole("form", { name: "Add to Projects and research" });
    await userEvent.type(within(form).getByLabelText(/^Title/), "River Survey");
    await userEvent.type(within(form).getByLabelText("Notes for drafting"), "Mapped a river.");
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));

    expect(saveEntry).toHaveBeenCalledWith(
      {
        section: "projects",
        source: null,
        show: true,
        fields: { title: "River Survey", period: "", subtitle: "" },
        approved: null,
        sourceNotes: "Mapped a river.",
      },
      '"v1"',
    );
  });

  it("edits a CV-only entry by its id and keeps its notes", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Edit Harbour Tracker" }));
    const form = screen.getByRole("form", { name: "Edit Harbour Tracker" });
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));
    expect(saveEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "entry.projects.cv-1",
        source: null,
        sourceNotes: "A tide alert app.",
        approved: { roleLine: "Solo project", bullets: ["Built a tide alert app."] },
      }),
      '"v1"',
    );
  });

  it("deletes a CV-only entry after confirming", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Harbour Tracker" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteEntry).toHaveBeenCalledWith("entry.projects.cv-1", '"v1"'));
  });

  it("deletes an orphaned entry", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Delete Old Cloud Badge" }));
    await userEvent.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }),
    );
    await waitFor(() =>
      expect(deleteEntry).toHaveBeenCalledWith("entry.certifications.c9", '"v1"'),
    );
  });

  it("adds an award to the top of the list by saving the whole profile", async () => {
    renderTab();
    await userEvent.click(
      await screen.findByRole("button", { name: "Add to Achievements and awards" }),
    );
    const form = screen.getByRole("form", { name: "Add award" });
    await userEvent.type(within(form).getByLabelText(/^Award/), "Hackathon winner");
    await userEvent.type(within(form).getByLabelText("Year"), "2025");
    await userEvent.click(within(form).getByRole("button", { name: "Save" }));

    const [profile, version] = saveProfile.mock.calls[0];
    expect(version).toBe('"v1"');
    expect(profile.header).toEqual(PROFILE.header);
    expect(profile.skills).toEqual(PROFILE.skills);
    expect(profile.awards).toEqual([
      { id: expect.stringMatching(/^cv-/), title: "Hackathon winner", issuer: "", year: "2025" },
      PROFILE.awards[0],
    ]);
  });

  it("shows a refused change next to the item", async () => {
    setShown.mockRejectedValue(new Error("Something changed since this loaded."));
    renderTab();
    await userEvent.click(
      await screen.findByRole("switch", { name: "Show on CV: Clinic Scheduler" }),
    );
    const projects = await region("Projects and research");
    expect(await within(row(projects, "Clinic Scheduler")).findByRole("alert")).toHaveTextContent(
      "Something changed since this loaded.",
    );
  });

  it("shows a failed load with a way to retry", async () => {
    load.mockReset().mockRejectedValue(new Error("Couldn't reach the server."));
    renderTab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't reach the server.");
    expect(screen.getByText("Couldn't load your CV. Try Refresh.")).toBeInTheDocument();
  });
});

describe("CvTab profile", () => {
  it("saves the header and footnotes with the lists as they were", async () => {
    renderTab();
    await userEvent.click(await screen.findByRole("button", { name: "Profile" }));
    expect(screen.getByText("Available upon request")).toBeInTheDocument();
    const title = screen.getByLabelText(/^Title/);
    await userEvent.clear(title);
    await userEvent.type(title, "Frontend Engineer");
    await userEvent.type(screen.getByRole("textbox", { name: "Footnotes" }), "*A made-up footnote");
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));

    expect(saveProfile).toHaveBeenCalledWith(
      {
        header: { ...PROFILE.header, title: "Frontend Engineer" },
        awards: PROFILE.awards,
        coCurricular: [],
        skills: PROFILE.skills,
        references: PROFILE.references,
        footnotes: ["*A made-up footnote"],
      },
      '"v1"',
    );
  });

  it("needs a name before the first profile save, and the lists wait for it", async () => {
    load.mockReset().mockResolvedValue({ ...DATA, profile: null });
    renderTab();
    expect(
      within(await region("Skills")).getByText(/Save your name in Profile first/),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Profile" }));
    await userEvent.click(screen.getByRole("button", { name: "Save profile" }));
    // The browser's own check stops the empty required name.
    expect(screen.getByRole("textbox", { name: /^Name/ })).toBeInvalid();
    expect(saveProfile).not.toHaveBeenCalled();
  });
});

describe("CV tab on the read-only dashboard", () => {
  it("never renders or loads there, and does for the admin", async () => {
    const { TabContentExtra } = await import("../../TabContentExtra");
    type Props = Parameters<typeof TabContentExtra>[0];
    const props = { activeTab: "cv", theme: "light", loading: false } as Props;

    const { unmount } = render(<TabContentExtra {...props} isReadOnly />);
    expect(screen.queryByRole("heading", { name: "CV" })).toBeNull();
    expect(load).not.toHaveBeenCalled();
    unmount();

    render(
      <ConfirmProvider>
        <TabContentExtra {...props} isReadOnly={false} />
      </ConfirmProvider>,
    );
    expect(await screen.findByRole("heading", { name: "CV" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  }, 30_000);
});
