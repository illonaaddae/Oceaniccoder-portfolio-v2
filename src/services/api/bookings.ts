import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from "./client";
import { Permission, Role } from "appwrite";

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
}

export async function createBooking(
  booking: Omit<Booking, "$id" | "$createdAt">,
): Promise<Booking> {
  const result = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.BOOKINGS,
    ID.unique(),
    { ...booking } as Record<string, unknown>,
    [Permission.read(Role.any()), Permission.update(Role.any()), Permission.delete(Role.any())],
  );
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
  // Fetch all bookings and filter client-side — avoids requiring attribute indexes in Appwrite
  const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BOOKINGS, [
    Query.limit(500),
  ]);
  return response.documents.some(
    (doc) => doc.preferredDate === preferredDate && doc.preferredTime === preferredTime,
  );
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
