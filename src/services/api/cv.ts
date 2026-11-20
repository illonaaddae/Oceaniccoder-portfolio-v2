import { apiUrl } from "@/utils/apiUrl";
import { adminHeaders } from "./adminHeaders";
import type {
  CvData,
  CvEntry,
  CvEntryInput,
  CvProfile,
  CvProfileInput,
  CvSection,
} from "@/types/cv";

export class CvApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CvApiError";
    this.status = status;
  }
}

/** One admin-only action on /api/cv. */
async function call<T>(action: string, input: object = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/api/cv"), {
      method: "POST",
      headers: await adminHeaders(),
      body: JSON.stringify({ action, ...input }),
    });
  } catch {
    throw new CvApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  let body: { error?: string };
  try {
    body = await res.json();
  } catch {
    throw new CvApiError(`Unexpected response from the server (${res.status}).`, res.status);
  }
  if (!res.ok) throw new CvApiError(body.error || "Something went wrong.", res.status);
  return body as T;
}

/** The `version` from the load the screen was built from; see CvData. */
type Version = string | null;

export const cvApi = {
  load: () => call<CvData>("load"),
  saveProfile: (profile: CvProfileInput, version: Version) =>
    call<{ profile: CvProfile }>("saveProfile", { profile, version }),
  saveEntry: (entry: CvEntryInput, version: Version) =>
    call<{ entry: CvEntry }>("saveEntry", { entry, version }),
  /** `id` may be a site item's entry id that has no entry yet; one is created. */
  setShown: (id: string, show: boolean, version: Version) =>
    call<{ entry: CvEntry }>("setShown", { id, show, version }),
  /** `ids`: every item of the section, in the new order. */
  reorder: (section: CvSection, ids: string[], version: Version) =>
    call<{ entries: CvEntry[] }>("reorder", { section, ids, version }),
  deleteEntry: (id: string, version: Version) =>
    call<{ deleted: string }>("deleteEntry", { id, version }),
};
