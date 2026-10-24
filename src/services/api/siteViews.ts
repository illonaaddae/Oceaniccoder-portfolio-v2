import { getJson, postJson } from "./dataApi";

export async function getSiteViews(): Promise<number> {
  try {
    return (await getJson<{ count: number }>("/api/counters/site-views")).count;
  } catch {
    return 0;
  }
}

export async function incrementSiteViews(): Promise<number> {
  try {
    return (await postJson<{ count: number }>("/api/counters/site-view", {})).count;
  } catch {
    return 0;
  }
}
