import type { ClientQuote } from "@/types/quote";

export interface JourneyStep {
  key: string;
  label: string;
  done: boolean;
  current: boolean;
}

/** Review → Accept → one step per payment stage. The current step is the first one not done. */
export function journeySteps(quote: ClientQuote): JourneyStep[] {
  const accepted = quote.status === "accepted";
  const steps = [
    { key: "review", label: "Review", done: true },
    { key: "accept", label: "Accept", done: accepted },
    ...quote.stages.map((s) => ({ key: s.id, label: s.label, done: s.state === "paid" })),
  ];
  const current = steps.findIndex((s) => !s.done);
  return steps.map((s, i) => ({ ...s, current: i === current }));
}
