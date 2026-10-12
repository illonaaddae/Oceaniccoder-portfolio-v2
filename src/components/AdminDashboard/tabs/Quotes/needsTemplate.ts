import type { NeedsDetailLabel, NeedsTables } from "@/types/quote";
import { emptyNeedsGroup, emptyNeedsRow } from "@/utils/needsTables";

/**
 * Starting content for "What I'll need from you" on a website-and-payments
 * project. Generic wording ("the business email", "your domain") so it fits
 * any client; edit per quote.
 */

type Row = [item: string, detail: string, when?: string];

interface TemplateGroup {
  title: string;
  detailLabel: NeedsDetailLabel;
  intro?: string;
  rows: Row[];
  footnote?: string;
}

const INTRO =
  "The timeline depends on these items arriving on time. Accounts and Paystack documents are needed in week 1, because provider approvals take time. Content is needed by week 4.";

const GROUPS: TemplateGroup[] = [
  {
    title: "Content and media",
    detailLabel: "Used for",
    rows: [
      [
        "Logo in vector format (SVG, AI or PDF) or high-resolution PNG, plus your brand colours if you have them",
        "Website, app icon, emails, invoices",
        "Week 1",
      ],
      [
        "Photos and videos for each trip and destination",
        "Trip pages, galleries, home page",
        "Week 4",
      ],
      [
        "Trip details: itinerary, inclusions and exclusions, dates, seats, prices, meeting points",
        "Trip packages and booking",
        "Week 4",
      ],
      ["Team names, roles, short bios and photos", "About and team pages", "Week 4"],
      [
        "Your story, mission and the text you want on the home and about pages (I can draft it from your notes)",
        "Website copy",
        "Week 4",
      ],
      [
        "Terms, privacy, cancellation and refund policies",
        "Legal pages and checkout",
        "Before launch",
      ],
      [
        "Real customer testimonials, with permission to publish",
        "Home and trip pages",
        "Before launch (optional)",
      ],
    ],
    footnote:
      "How to send photos and videos: in one shared Google Drive folder, with a sub-folder per trip or destination. Please send the original files, not copies from WhatsApp, which are heavily compressed. Name the photographer if credit is needed, and only include photos where the people shown have agreed to appear online.",
  },
  {
    title: "Accounts and access",
    detailLabel: "Used for",
    rows: [
      [
        "Access to the business email during development",
        "Receiving set-up and verification emails from Appwrite, Paystack, Cloudflare and Resend",
        "Week 1",
      ],
      [
        "Access to your domain settings (the registrar where your domain is managed)",
        "Connecting the new site without interrupting your email",
        "Week 1",
      ],
      [
        "Provider accounts opened in the business's name, with me added as a member: Appwrite, Paystack, Cloudflare, Resend",
        "Hosting, payments, security, emails",
        "Week 1",
      ],
      [
        "Bank account or merchant Mobile Money account in the business's name",
        "Where Paystack pays out your money",
        "Week 1",
      ],
    ],
    footnote:
      "At handover, you change the email password and I am removed from any account you choose. You keep full control throughout.",
  },
  {
    title: "Business documents for Paystack",
    detailLabel: "Notes",
    intro:
      "Paystack is regulated by the Bank of Ghana, so it must verify the business before it can take live payments. The documents depend on how the business is registered.",
    rows: [
      [
        "Business registration certificate (Registrar General's Department)",
        "Certificate of Registration for a sole proprietorship, or Certificate of Incorporation for a company",
      ],
      [
        "Registration form with the owners' and directors' details",
        "Form A for a registered business name, or Form 3 for a company limited by shares",
      ],
      ["Tax Identification Number (TIN)", "For the business"],
      [
        "Ghana Card of the CEO or founder",
        "Paystack prefers the Ghana Card; names must match across all documents",
      ],
      [
        "Ghana Card, phone number and residential address of every director and shareholder Paystack asks for",
        "As listed on the registration form",
      ],
      [
        "Digital address (GhanaPost GPS) of the business and of each person listed",
        "For example GA-183-8164; available from the GhanaPost GPS app",
      ],
      ["Business phone, email and physical address", "Shown to customers on receipts"],
    ],
  },
];

/** A fresh copy of the template, with new ids each time. */
export function needsTemplate(): NeedsTables {
  return {
    intro: INTRO,
    groups: GROUPS.map((g) =>
      emptyNeedsGroup({
        title: g.title,
        detailLabel: g.detailLabel,
        intro: g.intro ?? "",
        footnote: g.footnote ?? "",
        rows: g.rows.map(([item, detail, when = ""]) => emptyNeedsRow({ item, detail, when })),
      }),
    ),
  };
}
