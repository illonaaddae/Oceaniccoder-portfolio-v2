/* global module, require */
// Storage for the CV: the `cv` container in the private `personal` Cosmos
// database, created on first use (see ../personal.js for how that database is
// kept private and how the version document guards every write), and a
// read-only view of the site records CV entries link to. Only /api/cv, behind
// the admin role, uses this file.

const { createPersonalRepo, createFakePersonalRepo } = require("../personal");
const { getDatabase, fromCosmos } = require("../cosmos");
const { VERSION_ID } = require("./model");

const CONTAINER_ID = "cv";

/** `container` is for tests; by default it is the `cv` container. */
function createCosmosCvRepo({ container } = {}) {
  return createPersonalRepo({
    containerId: CONTAINER_ID,
    versionId: VERSION_ID,
    label: "CV",
    container,
  });
}

/** An in-memory repo with the same interface, for tests. */
const createFakeCvRepo = createFakePersonalRepo;

// The fields of each site collection the CV uses (resolve.js) or the CV tab
// lists. Everything else on the record stays out of the response.
const SITE_FIELDS = {
  education: [
    "institution",
    "degree",
    "field",
    "period",
    "location",
    "gpa",
    "isVisible",
    "displayOrder",
  ],
  journey: ["role", "company", "period", "location", "achievements", "order"],
  projects: ["title", "year", "role", "status"],
  certifications: ["title", "issuer", "date"],
};

function pick(row, fields) {
  const out = { $id: row.$id, $createdAt: row.$createdAt };
  for (const field of fields) if (row[field] !== undefined) out[field] = row[field];
  return out;
}

/**
 * Reads the site records CV entries link to, from the `portfolio` database,
 * in the site's own shape ($id). `database` is for tests.
 */
function createSiteReader({ database = getDatabase } = {}) {
  return async function readSiteRecords() {
    const db = database();
    const lists = await Promise.all(
      Object.entries(SITE_FIELDS).map(async ([collection, fields]) => {
        const { resources } = await db
          .container(collection)
          .items.query({ query: "SELECT * FROM c" })
          .fetchAll();
        return [collection, resources.map((doc) => pick(fromCosmos(doc), fields))];
      }),
    );
    return Object.fromEntries(lists);
  };
}

module.exports = {
  CONTAINER_ID,
  SITE_FIELDS,
  createCosmosCvRepo,
  createFakeCvRepo,
  createSiteReader,
};
