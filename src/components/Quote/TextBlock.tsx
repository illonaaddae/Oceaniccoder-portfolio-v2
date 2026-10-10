import React from "react";

// Quote text is plain text written by the admin: blank lines split
// paragraphs, "- " starts a bullet, and https links become clickable. Nothing
// is ever rendered as HTML.

function linkify(line: string) {
  return line.split(/(https:\/\/[^\s<]+)/g).map((part, i) =>
    part.startsWith("https://") ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline break-all"
        style={{ color: "var(--accent-teal)" }}
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export default function TextBlock({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc pl-5 space-y-1 mb-3">
          {bullets.map((b, i) => (
            <li key={i}>{linkify(b)}</li>
          ))}
        </ul>,
      );
      bullets = [];
    }
  };
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2));
      continue;
    }
    flush();
    if (line.trim())
      blocks.push(
        <p key={`p-${blocks.length}`} className="mb-3">
          {linkify(line)}
        </p>,
      );
  }
  flush();
  return (
    <div className="text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
      {blocks}
    </div>
  );
}
