/**
 * Generate or retrieve a persistent visitor ID for tracking reactions.
 */
export const getVisitorId = () => {
  let visitorId = localStorage.getItem("blog_visitor_id");
  if (!visitorId) {
    visitorId =
      "visitor_" +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);
    localStorage.setItem("blog_visitor_id", visitorId);
  }
  return visitorId;
};

/**
 * Format an ISO date string for display (e.g. "January 15, 2025").
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * Normalize markdown content — fix smart quotes, entities, and line endings.
 */
export const normalizeContent = (raw) =>
  raw
    ?.replace(/[\u2018\u2019]/g, "'")
    ?.replace(/[\u201C\u201D]/g, '"')
    ?.replace(/\r\n/g, "\n")
    ?.replace(/\\n/g, "\n")
    ?.replace(/&ast;/g, "*")
    ?.replace(/&#42;/g, "*")
    ?.replace(/\\\*/g, "*");
