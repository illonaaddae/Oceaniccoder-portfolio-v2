import { COLLECTIONS } from "./collections";
import {
  getJson,
  manageDelete,
  manageList,
  manageUpdate,
  readsAsAdmin,
  submitRow,
} from "./dataApi";

export interface Booking {
  $id?: string;
  $createdAt?: string;
  name: string;
  email: string;
  phone: string;
  meetingType: string;
  preferredDate: string;
  preferredTime: string;
  timezone: string;
  message: string;
  status: string;
  preferredPlatform?: string;
  meetingLink?: string;
  zoomLink?: string;
  calendarEventLink?: string;
}

export async function createBooking(
  booking: Omit<Booking, "$id" | "$createdAt">,
  turnstileToken?: string | null,
): Promise<Booking> {
  return submitRow<Booking>(COLLECTIONS.BOOKINGS, booking, turnstileToken);
}

/** Every booking, newest first (the old 200-row limit dropped older ones). */
export async function getBookings(): Promise<Booking[]> {
  // Private rows (contact details): the read-only /dashboard shows none.
  if (!readsAsAdmin()) return [];
  const response = await manageList<Booking>(COLLECTIONS.BOOKINGS, {
    orderBy: "$createdAt",
    dir: "desc",
  });
  return response.documents;
}

export async function getBookedTimesForDate(preferredDate: string): Promise<Set<string>> {
  const { times } = await getJson<{ times: string[] }>(
    `/api/booked-times?date=${encodeURIComponent(preferredDate)}`,
  );
  return new Set(times);
}

export async function updateBookingStatus(
  id: string,
  status: "confirmed" | "cancelled" | "pending",
): Promise<void> {
  await manageUpdate(COLLECTIONS.BOOKINGS, id, { status });
}

export async function deleteBooking(id: string): Promise<void> {
  await manageDelete(COLLECTIONS.BOOKINGS, id);
}
