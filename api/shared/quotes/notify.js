// Builds and sends each quote email. Never rejects: an email failure is
// logged by the caller from the returned { ok, error }. linkCode is the
// one-time "#k=" code for the client's own copy (see quote-admin actions);
// null leaves the links bare, so the page asks for an emailed code.

const T = require("../email/quoteEmails");
const M = require("./model");
const V = require("./views");
const { sendEmail } = require("../email/send");

function createNotifier({
  send = sendEmail,
  adminEmail = process.env.RESEND_TO_EMAIL,
  base = V.siteBase(),
  receiptSecret = process.env.RECEIPT_SIGNING_SECRET,
} = {}) {
  const safe = async (fn) => {
    try {
      return await fn();
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };
  const to = (address, mail) =>
    address
      ? send({ to: address, ...mail })
      : Promise.resolve({ ok: false, error: "no recipient" });

  return {
    quoteSent: (q, token, linkCode = null) =>
      safe(() => to(q.clientEmail, T.quoteSent(V.quoteSentView(q, token, base, linkCode)))),
    quoteAccepted: (q, token, stages) =>
      safe(() => to(q.clientEmail, T.quoteAccepted(V.acceptedView(q, token, stages, base)))),
    // A sent or accepted quote emailed again with a fresh link, to one address.
    // A sent quote gets the quote email. An accepted one gets what is due now:
    // the acceptance email while the deposit is due, else that stage's invoice.
    quoteEmailAgain: (q, token, stages, address, linkCode = null) =>
      safe(() => {
        if (q.status !== "accepted")
          return to(address, T.quoteSent(V.quoteSentView(q, token, base, linkCode)));
        // Only the earliest due stage: one email, one invoice. Once it is paid,
        // Email again sends the next stage if it has been requested; otherwise
        // Request (or Resend request) on that stage does.
        const due = M.paymentSummary(stages).nextDue;
        if (!due) return { ok: false, error: "nothing is due" };
        return to(
          address,
          due.index === 0
            ? T.quoteAccepted(V.acceptedView(q, token, stages, base, linkCode))
            : T.paymentRequest(V.requestView(q, due, token, stages, base, linkCode)),
        );
      }),
    decision: (q, decision) =>
      safe(() => to(adminEmail, T.quoteDecisionAlert(V.decisionView(q, decision, base)))),
    paymentRequest: (q, stage, token, stages, linkCode = null) =>
      safe(() =>
        to(q.clientEmail, T.paymentRequest(V.requestView(q, stage, token, stages, base, linkCode))),
      ),
    paymentReceived: (q, p, stages) =>
      safe(async () => {
        const [client, admin] = await Promise.all([
          to(
            p.clientEmail || q.clientEmail,
            T.paymentReceipt(V.receiptEmailView(q, p, stages, base, receiptSecret)),
          ),
          to(adminEmail, T.paymentAlert(V.alertView(q, p, stages, "paid", null, base))),
        ]);
        return client.ok && admin.ok
          ? { ok: true }
          : { ok: false, error: client.error || admin.error };
      }),
    maintenanceOffer: (q, stages) =>
      safe(() => to(q.clientEmail, T.maintenanceOffer(V.maintenanceOfferEmailView(q, stages)))),
    paymentProblem: (q, p, problem) =>
      safe(() => to(adminEmail, T.paymentAlert(V.alertView(q, p, null, "problem", problem, base)))),
  };
}

module.exports = { createNotifier };
