import React, { useState, useEffect, useMemo } from "react";
import { FaCode, FaUsers, FaMicrophone, FaStar } from "react-icons/fa";
import { usePortfolioData } from "../hooks/usePortfolioData";
import {
  AboutBackground,
  IntroHero,
  SectionHeader,
  TabNavigation,
  StoryTab,
  JourneyTab,
  EducationTab,
  ValuesTab,
} from "./About";

// Slim orchestrator – sub-components live in ./About/
const AboutSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("story");

  const {
    education,
    journey,
    certifications,
    gallery: galleryImages,
    projects,
    about,
  } = usePortfolioData();

  useEffect(() => {
    setIsVisible(true);
  }, [education, journey, certifications, galleryImages]);

  const stats = useMemo(() => [
    { icon: <FaCode />, number: `${projects?.length || 15}+`, label: "Projects Completed", color: "text-oceanic-500" },
    { icon: <FaUsers />, number: `${about?.studentsMentored || 40}+`, label: "Students Mentored", color: "text-green-400" },
    { icon: <FaMicrophone />, number: `${about?.techTalks || 2}+`, label: "Tech Talks Given", color: "text-purple-400" },
    { icon: <FaStar />, number: `${about?.yearsExperience || 2}+`, label: "Years Experience", color: "text-orange-400" },
  ], [projects, about]);

  return (
    <section
      id="about"
      className="min-h-[auto] sm:min-h-screen pt-28 sm:pt-28 pb-12 sm:pb-20 relative scroll-mt-24 sm:scroll-mt-28"
      style={{
        scrollMarginTop: "6rem",
        background:
          "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)",
      }}
    >
      <AboutBackground />
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <IntroHero />
        <SectionHeader isVisible={isVisible} stats={stats} />
        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="max-w-6xl mx-auto">
          {activeTab === "story" && (
            <StoryTab
              galleryImages={galleryImages}
              about={about}
              certifications={certifications}
            />
          )}
          {activeTab === "journey" && <JourneyTab journey={journey} />}
          {activeTab === "education" && (
            <EducationTab
              education={education}
              certifications={certifications}
              about={about}
            />
          )}
          {activeTab === "values" && <ValuesTab />}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
