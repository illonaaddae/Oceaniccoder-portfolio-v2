import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { About } from "../../types";

/** Shown until the dashboard's About fields are filled in. */
const DEFAULT_NAME = "Illona";
const DEFAULT_TAGLINE =
  "Software and AI engineer, founder of SLINT Tech, and mentor to the next generation of African innovators. Below is my story, my work, and where I'm headed.";
const DEFAULT_HEADSHOT =
  "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444ce3002c5e175da5/view?project=6943431e00253c8f9883";

interface IntroHeroProps {
  about?: About | null;
}

const IntroHero = React.memo(({ about }: IntroHeroProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // About Me -> Title/Name, Subtitle/Tagline and Profile Image URL drive this
  // block. They were previously saved to Appwrite and read by nothing.
  const name = about?.title?.trim() || DEFAULT_NAME;
  const tagline = about?.subtitle?.trim() || DEFAULT_TAGLINE;
  const headshot = about?.profileImage?.trim() || DEFAULT_HEADSHOT;

  return (
    <div className="mb-8 sm:mb-12 flex flex-col items-center text-center">
      <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl mb-4">
        <img
          src={headshot}
          alt={`${name} headshot`}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = DEFAULT_HEADSHOT;
          }}
        />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Hello, I'm {name}</h3>
      <p className="text-gray-200 max-w-2xl">{tagline}</p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={() => {
            try {
              const el = document.getElementById("contact");
              const nav = document.querySelector("nav");
              const navHeight = (nav && nav.offsetHeight) || 80;

              const scrollInto = (target: HTMLElement) => {
                const rect = target.getBoundingClientRect();
                const top = rect.top + window.scrollY - navHeight - 12;
                window.scrollTo({ top, left: 0, behavior: "smooth" });
              };

              if (location.pathname === "/contact") {
                if (el) scrollInto(el);
                return;
              }

              navigate("/contact");
              setTimeout(() => {
                const el2 = document.getElementById("contact");
                if (el2) scrollInto(el2);
              }, 350);
            } catch {
              navigate("/contact");
            }
          }}
          className="glass-btn about-btn-hire px-5 py-2 rounded-lg font-medium"
        >
          Hire Me
        </button>
        <button
          onClick={() =>
            window.scrollTo({
              top: window.scrollY + 400,
              behavior: "smooth",
            })
          }
          className="glass-btn about-btn-learn border border-oceanic-500/40 px-5 py-2 rounded-lg font-medium"
        >
          Learn More
        </button>
      </div>
    </div>
  );
});

IntroHero.displayName = "IntroHero";
export default IntroHero;
