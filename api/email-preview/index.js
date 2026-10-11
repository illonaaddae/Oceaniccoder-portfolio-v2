// /api/email-preview — admin-only previews of every email the site sends, with
// sample data, plus "send a test to me". The list lives in shared/email/catalog.

const { requireAdmin } = require("../shared/adminAuth");
const { send, readJson, handleError, HttpError } = require("../shared/http");
const { CATALOG, findEmail } = require("../shared/email/catalog");
const { sendEmail } = require("../shared/email/send");

function createHandler(deps) {
  return async function (context, req) {
    const auth = await deps.requireAdmin(context, req);
    if (!auth || !auth.user)
      return send(context, (auth && auth.status) || 401, {
        error: (auth && auth.error) || "Sign in again.",
      });
    try {
      const name = req.method === "POST" ? readJson(req).name : (req.query || {}).name;
      if (req.method !== "POST" && !name)
        return send(context, 200, {
          from: deps.fromEmail(),
          templates: CATALOG.map(({ id, group, name: label, when, render }) => ({
            id,
            group,
            name: label,
            when,
            subject: render().subject,
          })),
        });
      const entry = findEmail(name);
      if (!entry) throw new HttpError(404, "No such template.");
      const mail = entry.render();
      if (req.method !== "POST")
        return send(context, 200, {
          name,
          group: entry.group,
          label: entry.name,
          when: entry.when,
          ...mail,
        });
      const to = deps.adminEmail();
      if (!to) throw new HttpError(500, "RESEND_TO_EMAIL is not configured.");
      const result = await deps.send({ to, ...mail, subject: `[Test] ${mail.subject}` });
      if (!result.ok) throw new HttpError(502, `Resend refused the email: ${result.error}`);
      return send(context, 200, { sent: true, to });
    } catch (err) {
      return handleError(context, err, "email-preview");
    }
  };
}

module.exports = createHandler({
  requireAdmin,
  send: sendEmail,
  adminEmail: () => process.env.RESEND_TO_EMAIL,
  fromEmail: () => process.env.RESEND_FROM_EMAIL || "invoices@send.oceaniccoder.dev",
});
module.exports.createHandler = createHandler;
