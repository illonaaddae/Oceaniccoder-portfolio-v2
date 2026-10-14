// Builds and sends each quote email. Never rejects: an email failure is
// logged by the caller from the returned { ok, error }.

const T = require("../email/quoteEmails");
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
    quoteSent: (q, token) =>
      safe(() => to(q.clientEmail, T.quoteSent(V.quoteSentView(q, token, base)))),
    quoteAccepted: (q, token, stages) =>
      safe(() => to(q.clientEmail, T.quoteAccepted(V.acceptedView(q, token, stages, base)))),
    // A sent or accepted quote emailed again with a fresh link, to one address.
    quoteEmailAgain: (q, token, stages, address) =>
      safe(() =>
        to(
          address,
          q.status === "accepted"
            ? T.quoteAccepted(V.acceptedView(q, token, stages, base))
            : T.quoteSent(V.quoteSentView(q, token, base)),
        ),
      ),
    decision: (q, decision) =>
      safe(() => to(adminEmail, T.quoteDecisionAlert(V.decisionView(q, decision, base)))),
    paymentRequest: (q, stage, token, stages) =>
      safe(() => to(q.clientEmail, T.paymentRequest(V.requestView(q, stage, token, stages, base)))),
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
