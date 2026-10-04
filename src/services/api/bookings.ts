import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import { getJson, manageDelete, manageList, manageUpdate, submitRow, usesCosmos } from "./dataApi";

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
  if (usesCosmos) return submitRow<Booking>(COLLECTIONS.BOOKINGS, booking, turnstileToken);
  // No document-level permissions — collection-level permissions govern
  // (visitors create, only admin reads/updates/deletes — set in Appwrite Console)
  const result = await databases.createDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, ID.unique(), {
    ...booking,
  } as Record<string, unknown>);
  return result as unknown as Booking;
}

export async function getBookings(): Promise<Booking[]> {
  const response = usesCosmos
    ? await manageList(COLLECTIONS.BOOKINGS, { orderBy: "$createdAt", dir: "desc", limit: 200 })
    : await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKINGS, [
        Query.limit(200),
        Query.orderDesc("$createdAt"),
      ]);
  return response.documents as unknown as Booking[];
}

export async function isSlotBooked(preferredDate: string, preferredTime: string): Promise<boolean> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKINGS, [
    Query.limit(500),
  ]);
  return response.documents.some(
    (doc) => doc.preferredDate === preferredDate && doc.preferredTime === preferredTime,
  );
}

export async function getBookedTimesForDate(preferredDate: string): Promise<Set<string>> {
  if (usesCosmos) {
    const { times } = await getJson<{ times: string[] }>(
      `/api/booked-times?date=${encodeURIComponent(preferredDate)}`,
    );
    return new Set(times);
  }
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKINGS, [
    Query.limit(500),
  ]);
  const booked = new Set<string>();
  response.documents.forEach((doc) => {
    if (doc.preferredDate === preferredDate) booked.add(doc.preferredTime as string);
  });
  return booked;
}

export async function updateBookingStatus(
  id: string,
  status: "confirmed" | "cancelled" | "pending",
): Promise<void> {
  await (usesCosmos
    ? manageUpdate(COLLECTIONS.BOOKINGS, id, { status })
    : databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, id, { status }));
}

export async function deleteBooking(id: string): Promise<void> {
  await (usesCosmos
    ? manageDelete(COLLECTIONS.BOOKINGS, id)
    : databases.deleteDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, id));
}
