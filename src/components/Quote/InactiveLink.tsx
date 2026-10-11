import { QuoteCard } from "./QuoteShell";

export default function InactiveLink() {
  return (
    <QuoteCard className="text-center">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
        This link is no longer active
      </h1>
      <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
        The quote may have been updated, replaced or withdrawn. Ask for the latest link and we'll
        send it straight over.
      </p>
      <a
        href="mailto:hello@oceaniccoder.dev?subject=Quote%20link"
        className="inline-block px-5 py-3 rounded-xl font-semibold text-white"
        style={{ background: "var(--quote-cta)" }}
      >
        Email hello@oceaniccoder.dev
      </a>
    </QuoteCard>
  );
}
