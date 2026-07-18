import { useState, useEffect } from "react";
import { getBookings } from "@/services/api/bookings";
import { getInquiries } from "@/services/api/inquiries";
import { getAllComments } from "@/services/api/comments";
import type { Message } from "@/types";
import type { TabType } from "./types";

export interface NotificationItem {
  id: string;
  type: "message" | "booking" | "inquiry" | "comment";
  label: string;
  sublabel?: string;
  time: string;
  tab: TabType;
}

/**
 * Aggregate actionable admin items (unread messages, pending bookings, new
 * inquiries, unapproved comments) into one notification feed + count.
 * Messages come from already-loaded admin data; the rest are polled.
 */
export function useNotifications(messages: Message[]): {
  items: NotificationItem[];
  count: number;
} {
  const [others, setOthers] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [bookings, inquiries, comments] = await Promise.all([
        getBookings().catch(() => []),
        getInquiries().catch(() => []),
        getAllComments().catch(() => []),
      ]);
      if (!active) return;

      const items: NotificationItem[] = [];

      for (const b of bookings) {
        if (b.status === "pending") {
          items.push({
            id: `booking-${b.$id}`,
            type: "booking",
            label: `Booking · ${b.meetingType || "Meeting"}`,
            sublabel: b.name,
            time: b.$createdAt || "",
            tab: "bookings",
          });
        }
      }

      for (const i of inquiries) {
        if (i.status === "new") {
          items.push({
            id: `inquiry-${i.$id}`,
            type: "inquiry",
            label: `Inquiry · ${i.projectType || "Project"}`,
            sublabel: i.name,
            time: i.$createdAt || "",
            tab: "client-work",
          });
        }
      }

      for (const c of comments) {
        if (!c.isApproved) {
          items.push({
            id: `comment-${c.$id}`,
            type: "comment",
            label: `Comment by ${c.authorName}`,
            sublabel: c.content,
            time: c.$createdAt || "",
            tab: "comments",
          });
        }
      }

      setOthers(items);
    };

    load();
    const id = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const messageItems: NotificationItem[] = messages
    .filter((m) => !m.status || m.status === "new")
    .map((m) => ({
      id: `message-${m.$id}`,
      type: "message",
      label: m.subject || "New message",
      sublabel: `From ${m.name}`,
      time: m.$createdAt || "",
      tab: "messages",
    }));

  const items = [...messageItems, ...others].sort((a, b) => b.time.localeCompare(a.time));

  return { items, count: items.length };
}
