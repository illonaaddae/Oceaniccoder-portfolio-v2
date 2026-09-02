/**
 * Estimates a post's read time from its Markdown body.
 *
 * Kept as a pure function so the counting rules are testable: what counts as a
 * word here is not obvious, and getting it wrong shows on every post.
 *
 * 225 wpm is the usual figure for adults reading technical prose on screen.
 * Code is deliberately not counted at prose speed — a fenced block is skimmed
 * or studied, never read word by word — so it is billed by line instead, and
 * images get a flat allowance for the pause they cause.
 */

const WORDS_PER_MINUTE = 225;
const SECONDS_PER_CODE_LINE = 2;
const SECONDS_PER_IMAGE = 4;

export interface ReadTimeEstimate {
  minutes: number;
  words: number;
  label: string;
}

/** Strips the Markdown that should not be read aloud. */
function toProse(markdown: string): { prose: string; codeLines: number; images: number } {
  let codeLines = 0;
  let images = 0;

  const withoutFences = markdown.replace(/```[\s\S]*?(?:```|$)/g, (block) => {
    // -2 for the fence lines themselves.
    codeLines += Math.max(0, block.split("\n").length - 2);
    return " ";
  });

  const prose = withoutFences
    .replace(/!\[[^\]]*\]\([^)]*\)/g, () => {
      images += 1;
      return " ";
    })
    // Link text is read; the URL is not.
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`[^`]*`/g, " ")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/gm, "")
    .replace(/^\s*\|.*\|\s*$/gm, " ")
    .replace(/[*_~]+/g, "")
    .replace(/<[^>]+>/g, " ");

  return { prose, codeLines, images };
}

export function countWords(markdown: string): number {
  const { prose } = toProse(markdown);
  const matches = prose.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return matches ? matches.length : 0;
}

export function estimateReadTime(markdown: string): ReadTimeEstimate {
  const { codeLines, images } = toProse(markdown);
  const words = countWords(markdown);

  const seconds =
    (words / WORDS_PER_MINUTE) * 60 +
    codeLines * SECONDS_PER_CODE_LINE +
    images * SECONDS_PER_IMAGE;

  // Anything with content is at least a minute; "0 min read" reads as an error.
  const minutes =
    words === 0 && codeLines === 0 && images === 0 ? 0 : Math.max(1, Math.round(seconds / 60));

  return { minutes, words, label: minutes === 0 ? "" : `${minutes} min read` };
}
