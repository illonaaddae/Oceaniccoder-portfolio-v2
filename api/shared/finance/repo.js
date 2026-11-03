// Storage for personal finance records: the `finance` container in the
// private `personal` Cosmos database (see ../personal.js for how that database
// is kept private and how the version document guards every write). Only
// /api/finance, behind the admin role, uses this file.

const {
  DATABASE_ID,
  STALE,
  stamp,
  createPersonalRepo,
  createFakePersonalRepo,
} = require("../personal");

const CONTAINER_ID = "finance";

// The document whose etag stands for the whole ledger.
const VERSION_ID = "ledger-version";

/** `container` is for tests; by default it is the `finance` container. */
function createCosmosFinanceRepo({ container } = {}) {
  return createPersonalRepo({
    containerId: CONTAINER_ID,
    versionId: VERSION_ID,
    label: "Finance",
    container,
  });
}

/**
 * An in-memory repo with the same interface, for tests. It fails a create of
 * an existing id, which is what stops the same expected income being received
 * twice by overlapping requests.
 */
const createFakeFinanceRepo = createFakePersonalRepo;

module.exports = {
  DATABASE_ID,
  CONTAINER_ID,
  VERSION_ID,
  STALE,
  stamp,
  createCosmosFinanceRepo,
  createFakeFinanceRepo,
};
