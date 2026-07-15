import React, { useEffect, useState } from "react";
import { FaImage } from "react-icons/fa";
import { ImageUpload } from "@/components/AdminDashboard/ImageUpload";
import { getHeroImages, setHeroImage } from "@/services/api/settings";
import { getCardClass, getHeadingClass, getLabelClass } from "./styles";

interface Props {
  theme: "light" | "dark";
  isReadOnly: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const HeroImagesSection: React.FC<Props> = ({ theme, isReadOnly, onSuccess, onError }) => {
  const [light, setLight] = useState("");
  const [dark, setDark] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHeroImages()
      .then((imgs) => {
        setLight(imgs.light ?? "");
        setDark(imgs.dark ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const save = async (mode: "light" | "dark", url: string) => {
    if (mode === "light") setLight(url);
    else setDark(url);
    try {
      await setHeroImage(mode, url);
      onSuccess?.(`${mode === "light" ? "Light" : "Dark"}-mode hero image updated`);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save hero image");
    }
  };

  return (
    <div className={getCardClass(theme)}>
      <div className="mb-4">
        <h3 className={getHeadingClass(theme)}>
          <FaImage className="text-brand-link dark:text-oceanic-400" />
          Hero Images
        </h3>
        <p className={`mt-1 text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
          The photo shown on your home hero, per theme. Changes apply immediately, no redeploy
          needed.
        </p>
      </div>

      {loading ? (
        <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className={`mb-2 ${getLabelClass(theme)}`}>Light-mode hero</p>
            <ImageUpload
              value={light}
              onChange={(url) => save("light", url)}
              label=""
              theme={theme}
            />
          </div>
          <div>
            <p className={`mb-2 ${getLabelClass(theme)}`}>Dark-mode hero</p>
            <ImageUpload
              value={dark}
              onChange={(url) => save("dark", url)}
              label=""
              theme={theme}
            />
          </div>
        </div>
      )}

      {isReadOnly && (
        <p className={`mt-3 text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}>
          View-only mode — uploads are disabled.
        </p>
      )}
    </div>
  );
};

export default HeroImagesSection;
