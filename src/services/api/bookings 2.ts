import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";

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
  meetingLink?: string;
  calendarEventLink?: string;
}

export async function createBooking(
  booking: Omit<Booking, "$id" | "$createdAt">,
): Promise<Booking> {
  // No document-level permissions — collection-level permissions govern
  // (visitors create, only admin reads/updates/deletes — set in Appwrite Console)
  const result = await databases.createDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, ID.unique(), {
    ...booking,
  } as Record<string, unknown>);
  return result as unknown as Booking;
}

export async function getBookings(): Promise<Booking[]> {
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKINGS, [
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
  await databases.updateDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, id, { status });
}

export async function deleteBooking(id: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BOOKINGS, id);
}
