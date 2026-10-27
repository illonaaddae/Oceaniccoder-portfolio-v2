import React from "react";
import useSkillsData from "./Skills/useSkillsData";
import SectionHeader from "./Skills/SectionHeader";
import CategoryButtons from "./Skills/CategoryButtons";
import SkillGrid from "./Skills/SkillGrid";
import SkillsSummary from "./Skills/SkillsSummary";
import AIJourneyCard from "./AIJourney/AIJourneyCard";

const SkillsSection = () => {
  const {
    skills,
    activeSkillCategory,
    animatedSkills,
    totalTechnologies,
    projects,
    about,
    handleCategoryClick,
  } = useSkillsData();
  // The AI journey card sits beside the AI & Data Science skills only.
  const showAIJourney = skills[activeSkillCategory]?.category === "AI & Data Science";

  return (
    <section
      id="skills"
      className="min-h-dvh pt-28 pb-20 relative scroll-mt-24 sm:scroll-mt-28"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 50%, var(--bg-tertiary) 100%)",
      }}
    >
      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader />
        <CategoryButtons
          skills={skills}
          activeSkillCategory={activeSkillCategory}
          onCategoryClick={handleCategoryClick}
        />
        {showAIJourney ? (
          // Side by side from xl up: what I use now beside where I'm heading.
          <div className="xl:grid xl:grid-cols-2 xl:gap-8 xl:items-start xl:[&>*]:w-full max-w-7xl mx-auto">
            <SkillGrid
              skills={skills}
              activeSkillCategory={activeSkillCategory}
              animatedSkills={animatedSkills}
            />
            <AIJourneyCard className="w-full max-w-4xl mx-auto mt-12 xl:mt-0" />
          </div>
        ) : (
          <SkillGrid
            skills={skills}
            activeSkillCategory={activeSkillCategory}
            animatedSkills={animatedSkills}
          />
        )}
        <SkillsSummary projects={projects} about={about} totalTechnologies={totalTechnologies} />
      </div>
    </section>
  );
};

export default SkillsSection;
