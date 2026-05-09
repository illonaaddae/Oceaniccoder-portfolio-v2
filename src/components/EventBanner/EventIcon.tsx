import React from "react";
import {
  FaBirthdayCake,
  FaGift,
  FaStar,
  FaGraduationCap,
  FaHeart,
  FaTree,
  FaFlag,
  FaGhost,
  FaSun,
  FaLeaf,
  FaSnowflake,
  FaEgg,
  FaDrum,
} from "react-icons/fa";
import type { EventIconName } from "./types";

const iconMap: Record<
  EventIconName,
  React.ComponentType<{ className?: string }>
> = {
  birthday: FaBirthdayCake,
  gift: FaGift,
  star: FaStar,
  graduation: FaGraduationCap,
  heart: FaHeart,
  tree: FaTree,
  flag: FaFlag,
  ghost: FaGhost,
  sun: FaSun,
  leaf: FaLeaf,
  snowflake: FaSnowflake,
  egg: FaEgg,
  drum: FaDrum,
};

interface EventIconProps {
  name: EventIconName;
}

const EventIcon: React.FC<EventIconProps> = React.memo(({ name }) => {
  const Icon = iconMap[name];
  return <Icon className="text-xl md:text-2xl" />;
});

EventIcon.displayName = "EventIcon";

export default EventIcon;
