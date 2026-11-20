import { takeLinkCode, type DocumentKind } from "@/utils/linkCode";
import type { AccessTarget } from "@/services/api/access";

// A link code works once, so a page load claims it once, even when the page
// mounts twice (StrictMode) or loads the document again. A refused claim
// (used already, an older email, another browser got there first) or a
// network failure is not an error here: the lookup answers 401 and the code
// screen asks for an emailed code instead. Same rules as useClientQuote's
// for quotes.
const claims = new Map<string, Promise<boolean>>();

// Resolves once the page is in front of someone. A mail scanner that opens
// the link (and even runs its script) without showing it never gets here, so
// it can't spend the link code. Same rule as the code screen's auto-send.
function whenVisible(): Promise<void> {
  return new Promise((resolve) => {
    const go = () => {
      if (document.visibilityState !== "visible") return;
      document.removeEventListener("visibilitychange", go);
      resolve();
    };
    document.addEventListener("visibilitychange", go);
    go();
  });
}

// A claim that hasn't answered by then (a cold start, a hung function) is
// given up: the lookup goes on, and the code screen asks for a code instead.
const CLAIM_TIMEOUT_MS = 10000;

function claimWithin(claim: Promise<unknown>, ms: number): Promise<boolean> {
  let timer = 0;
  const giveUp = new Promise<boolean>((resolve) => {
    timer = window.setTimeout(() => resolve(false), ms);
  });
  const claimed = claim.then(
    () => true,
    () => false,
  );
  return Promise.race([claimed, giveUp]).finally(() => clearTimeout(timer));
}

/**
 * Claims the link code captured for this document's link, once per page
 * load. Resolves true when the claim signed the browser in. target is built
 * only when there is a code to claim.
 */
export function claimLinkOnce(
  kind: DocumentKind,
  key: string,
  target: () => AccessTarget,
): Promise<boolean> {
  const id = `${kind}:${key}`;
  const code = takeLinkCode(kind, key);
  if (code) {
    // The time limit starts once the page is visible: waiting to be seen
    // isn't the server being slow.
    const claim = whenVisible().then(() => claimWithin(target().claim(code), CLAIM_TIMEOUT_MS));
    claims.set(id, claim);
    void claim.then(() => claims.delete(id));
  }
  return claims.get(id) ?? Promise.resolve(false);
}
