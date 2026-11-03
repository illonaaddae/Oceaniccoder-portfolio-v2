// Builds the CV PDF on the server from what is saved now and shows it, with
// the page count and what to fix. Nothing is stored or published.
import { useEffect, useRef, useState } from "react";
import { cvApi } from "@/services/api/cv";
import type { CvWarning } from "@/types/cv";
import { Button, Card, FormError, muted, strong } from "../Finance/ui";
import type { CvState } from "./useCv";

interface Built {
  url: string;
  pages: number;
  warnings: CvWarning[];
  at: Date;
}

function pdfUrl(base64: string): string {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
}

const timeOf = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

export function PreviewView({ state }: { state: CvState }) {
  const [built, setBuilt] = useState<Built | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The blob URL on screen, revoked when it is replaced and when the view goes.
  const urlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function build() {
    if (building) return;
    setBuilding(true);
    setError(null);
    try {
      const preview = await cvApi.preview();
      const url = pdfUrl(preview.pdfBase64);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setBuilt({ url, pages: preview.pages, warnings: preview.warnings, at: new Date() });
      state.announce(
        `Preview built: ${plural(preview.pages, "page")}, ${plural(preview.warnings.length, "warning")}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't build the preview.");
    } finally {
      setBuilding(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card title="Preview">
        <p className="mb-3 text-sm" style={muted}>
          Builds the CV from what is saved now, exactly as it would print. Nothing is published.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={building} onClick={() => void build()}>
            {building ? "Building…" : built ? "Build again" : "Build preview"}
          </Button>
          {built && (
            <>
              <a
                href={built.url}
                download="cv-preview.pdf"
                className="text-sm font-semibold underline underline-offset-4"
                style={strong}
              >
                Download preview
              </a>
              <p className="text-sm tabular-nums" style={muted}>
                {plural(built.pages, "page")}, built {timeOf(built.at)}
              </p>
            </>
          )}
        </div>
        <div className="mt-3">
          <FormError message={error} />
        </div>
      </Card>
      {built && (
        <>
          <Card title="Warnings">
            {built.warnings.length === 0 ? (
              <p className="text-sm" style={muted}>
                None. Everything shown is on the CV.
              </p>
            ) : (
              <ul className="list-disc space-y-1 pl-5 text-sm" style={strong}>
                {built.warnings.map((w, i) => (
                  // Two warnings can share a code and entry (layout ones have none).
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={`${w.code}-${w.entryId}-${i}`}>{w.message}</li>
                ))}
              </ul>
            )}
          </Card>
          <iframe
            title="CV preview"
            src={built.url}
            className="h-[80vh] w-full rounded-xl border bg-white"
            style={{ borderColor: "var(--border-subtle)" }}
          />
        </>
      )}
    </div>
  );
}
