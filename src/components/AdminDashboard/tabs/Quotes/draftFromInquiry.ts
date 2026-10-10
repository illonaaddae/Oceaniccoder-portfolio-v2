import { newId, quoteToDraft } from "@/utils/quoteMath";
import type { ProjectInquiry } from "@/types";
import type { QuoteDraft } from "@/types/quote";

export function emptyDraft(): QuoteDraft {
  return quoteToDraft(null);
}

/** Seed a quote from an inquiry: client details, the project as the first line, domain and hosting if asked for. Prices start at 0. */
export function draftFromInquiry(inquiry: ProjectInquiry): QuoteDraft {
  const items: QuoteDraft["items"] = [
    { id: newId("item"), description: inquiry.projectType, qty: 1, unitMinor: 0 },
  ];
  if (inquiry.needsDomain && inquiry.domainExtension) {
    items.push({
      id: newId("item"),
      description: `Domain registration (${inquiry.domainExtension}), 1 year`,
      qty: 1,
      unitMinor: 0,
    });
  }
  if (inquiry.needsHosting)
    items.push({ id: newId("item"), description: "Hosting setup", qty: 1, unitMinor: 0 });
  return {
    ...emptyDraft(),
    clientName: inquiry.name,
    clientEmail: inquiry.email,
    clientPhone: inquiry.phone || "",
    title: inquiry.projectType,
    overview: inquiry.description || "",
    scope: (inquiry.features || []).map((f) => `- ${f}`).join("\n"),
    timeline: inquiry.timeline ? `Target: ${inquiry.timeline}` : "",
    items,
    inquiryId: inquiry.$id,
  };
}
