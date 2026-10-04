// Which times are already booked on a date, for the public booking form.
//
//   GET /api/booked-times?date=YYYY-MM-DD  → { times: ["10:00", …] }
//
// Bookings themselves are private (names, emails, phone numbers), so this
// returns the times and nothing else.

const { getDatabase } = require("../shared/cosmos");

const HEADERS = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

module.exports = async function (context, req) {
  const date = (req.query && req.query.date) || "";
  if (!DATE.test(date)) {
    context.res = {
      status: 400,
      headers: HEADERS,
      body: JSON.stringify({ error: "Invalid date" }),
    };
    return;
  }
  try {
    const { resources } = await getDatabase()
      .container("bookings")
      .items.query({
        query: "SELECT DISTINCT VALUE c.preferredTime FROM c WHERE c.preferredDate = @date",
        parameters: [{ name: "@date", value: date }],
      })
      .fetchAll();
    context.res = { status: 200, headers: HEADERS, body: JSON.stringify({ times: resources }) };
  } catch (err) {
    context.log.error("booked-times failed:", err.message);
    context.res = {
      status: 500,
      headers: HEADERS,
      body: JSON.stringify({ error: "Couldn't load booked times" }),
    };
  }
};
