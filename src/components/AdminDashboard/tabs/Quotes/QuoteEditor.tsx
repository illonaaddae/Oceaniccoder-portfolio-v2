import type { QuoteDraft } from "@/types/quote";

// Replaced by the real wizard in Task 17.
export default function QuoteEditor(_props: {
  theme: string;
  quoteId?: string;
  initial?: QuoteDraft;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  return null;
}
