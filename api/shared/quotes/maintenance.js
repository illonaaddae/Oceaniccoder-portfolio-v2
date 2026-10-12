// Sends the maintenance offer email and records when it went out. Used by
// the admin's "Send maintenance offer" button and the daily due-offers job.

/**
 * Emails the client the maintenance plans. maintenanceOfferSentAt is set only
 * when the email was accepted by the sender, so a failure is retried later.
 * Returns { ok, quote, error }.
 */
async function sendMaintenanceOffer(svc, quote, stages) {
  const mail = await svc.notify.maintenanceOffer(quote, stages);
  if (!mail.ok) return { ok: false, quote, error: mail.error || "send failed" };
  const updated = await svc.repo.update(quote.id, {
    maintenanceOfferSentAt: svc.now().toISOString(),
  });
  return { ok: true, quote: updated };
}

module.exports = { sendMaintenanceOffer };
