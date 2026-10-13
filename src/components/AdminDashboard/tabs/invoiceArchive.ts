import type { Invoice } from "@/types";

/**
 * Whether a one-off invoice counts as archived (set aside by the admin). A
 * paid invoice never does, even with a stray archivedAt from an archive that
 * raced the payment: money received always counts.
 */
export const isArchivedInvoice = (inv: Pick<Invoice, "archivedAt" | "status">) =>
  Boolean(inv.archivedAt) && inv.status !== "paid";
