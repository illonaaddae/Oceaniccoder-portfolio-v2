import type { Dispatch, SetStateAction } from "react";
import type { About } from "@/types";
import { saveAbout } from "@/services/api";
import type { LoadDataFn } from "./types";

export function createAboutHandlers(
  loadData: LoadDataFn,
  setAbout: Dispatch<SetStateAction<About | null>>,
) {
  const handleSaveAbout = async (aboutForm: Partial<About>) => {
    try {
      const savedAbout = await saveAbout(aboutForm);
      setAbout(savedAbout);
      await loadData(false);
    } catch (err) {
      console.error("Failed to save about:", err);
      throw err;
    }
  };

  return { handleSaveAbout };
}
