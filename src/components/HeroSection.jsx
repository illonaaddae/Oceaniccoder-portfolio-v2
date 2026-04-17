import React, { useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePortfolioData } from "../hooks/usePortfolioData";
import { roles } from "./Hero/heroData";
import { useTypewriter } from "./Hero/useTypewriter";
import BackgroundElements from "./Hero/BackgroundElements";
import ProfileImage from "./Hero/ProfileImage";
import HeroContent from "./Hero/HeroContent";
import SocialLinks from "./Hero/SocialLinks";
import ScrollIndicator from "./Hero/ScrollIndicator";

const HeroSection = () => {
  const navigate = useNavigate();
  const scrollTimeoutRef = useRef(null);
  const { about } = usePortfolioData();
  const displayText = useTypewriter(roles);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const scrollToProjects = useCallback(() => navigate("/projects"), [navigate]);
  const scrollToContact = useCallback(() => navigate("/contact"), [navigate]);

  const scrollToSkills = useCallback(() => {
    try {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      const el = document.getElementById("skills");
      const nav = document.querySelector("nav");
      const navHeight = (nav && nav.offsetHeight) || 80;
      const scrollInto = (target) => {
        const rect = target.getBoundingClientRect();
        const top = rect.top + window.scrollY - navHeight - 12;
        window.scrollTo({ top, left: 0, behavior: "smooth" });
      };
      if (el) {
        scrollInto(el);
        return;
      }
      navigate("/");
      scrollTimeoutRef.current = setTimeout(() => {
        const el2 = document.getElementById("skills");
        if (el2) scrollInto(el2);
        scrollTimeoutRef.current = null;
      }, 350);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  return (
    <section
      id="home"
      className="min-h-screen relative overflow-hidden pt-28 hero-section"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 50%, var(--brand-ocean-1) 100%)",
      }}
    >
      <BackgroundElements />
      <div className="container mx-auto px-6 relative z-10 flex flex-col min-h-screen justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-7xl mx-auto w-full">
          <div className="text-center lg:text-left order-2 lg:order-1 space-y-6 lg:space-y-8">
            <HeroContent
              displayText={displayText}
              onViewProjects={scrollToProjects}
              onHireMe={scrollToContact}
            />
            <SocialLinks resumeUrl={about?.resumeUrl} />
          </div>
          <ProfileImage />
        </div>
        <ScrollIndicator onScroll={scrollToSkills} />
      </div>
    </section>
  );
};

export default HeroSection;
