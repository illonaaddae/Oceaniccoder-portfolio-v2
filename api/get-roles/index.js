// Static Web Apps calls this after every sign-in (auth.rolesSource in
// public/staticwebapp.config.json) and attaches the returned roles to the
// session. Once rolesSource is set, SWA blocks outside HTTP requests to it.
// The decision itself is rolesFor() in api/shared/principal.js.

const { rolesFor } = require("../shared/principal");

module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roles: rolesFor(req.body) }),
  };
};
