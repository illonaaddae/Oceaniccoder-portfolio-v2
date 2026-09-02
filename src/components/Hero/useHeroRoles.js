import { useEffect, useState } from "react";
import { roles as DEFAULT_ROLES } from "./heroData";
import { getHeroRoles } from "@/services/api/settings";

/**
 * Roles for the hero typewriter, managed from the dashboard (About Me → Hero
 * Roles). Starts on the bundled defaults so the animation never renders empty
 * while the settings request is in flight, then swaps in the saved list.
 */
export function useHeroRoles() {
  const [roles, setRoles] = useState(DEFAULT_ROLES);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const saved = await getHeroRoles();
        if (active && saved.length > 0) setRoles(saved);
      } catch {
        // Settings unreachable — keep the bundled defaults.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return roles;
}
