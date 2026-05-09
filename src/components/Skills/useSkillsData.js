import { useState, useEffect, useMemo, useCallback } from "react";
import { usePortfolio } from "../../Context";
import { usePortfolioData } from "../../hooks/usePortfolioData";

const useSkillsData = () => {
  const { skills, activeSkillCategory, setActiveSkillCategory } =
    usePortfolio();
  const { projects, about } = usePortfolioData();
  const [animatedSkills, setAnimatedSkills] = useState({});

  const totalTechnologies = useMemo(() => {
    if (!skills) return 20;
    return skills.reduce(
      (total, category) => total + (category.skills?.length || 0),
      0,
    );
  }, [skills]);

  useEffect(() => {
    const timer = setTimeout(() => {
      skills[activeSkillCategory]?.skills.forEach((skill, index) => {
        setTimeout(() => {
          setAnimatedSkills((prev) => ({
            ...prev,
            [`${activeSkillCategory}-${index}`]: true,
          }));
        }, index * 100);
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [activeSkillCategory, skills]);

  const handleCategoryClick = useCallback(
    (index) => {
      setActiveSkillCategory(index);
      setAnimatedSkills({});
    },
    [setActiveSkillCategory],
  );

  return {
    skills,
    activeSkillCategory,
    animatedSkills,
    totalTechnologies,
    projects,
    about,
    handleCategoryClick,
  };
};

export default useSkillsData;
