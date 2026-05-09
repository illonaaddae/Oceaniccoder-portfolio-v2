import type { Event } from "./types";
import { eventsJanMar } from "./eventsJanMar";
import { eventsAprJul } from "./eventsAprJul";
import { eventsSepDec } from "./eventsSepDec";

export const EVENTS: Event[] = [
  ...eventsJanMar,
  ...eventsAprJul,
  ...eventsSepDec,
];
