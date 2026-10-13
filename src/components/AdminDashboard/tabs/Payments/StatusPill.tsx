import { StatusPill as Pill, type PillTone } from "../shared/StatusPill";
import type { DisplayStatus } from "./paymentStatus";

// Abandoned, duplicate and refunded are not alarms, so they are neutral.
const TONE: Record<DisplayStatus, PillTone> = {
  paid: "success",
  pending: "pending",
  failed: "failed",
  abandoned: "neutral",
  duplicate: "neutral-dashed",
  refunded: "neutral",
};

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  failed: "Failed",
  abandoned: "Abandoned",
  duplicate: "Duplicate",
  refunded: "Refunded",
};

export function StatusPill({ status, archived }: { status: DisplayStatus; archived?: boolean }) {
  return <Pill tone={TONE[status]} label={STATUS_LABEL[status]} archived={archived} />;
}
