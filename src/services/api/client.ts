export {
  databases,
  storage,
  account,
  DATABASE_ID,
  STORAGE_BUCKET_ID,
  COLLECTIONS,
} from "../../lib/appwrite";
export { Query, ID } from "appwrite";
// Raw client — needed for realtime subscriptions, which live on the client
// rather than on the Databases service.
export { default as client } from "../../lib/appwrite";
