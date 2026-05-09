export type EventIconName =
  | "birthday"
  | "gift"
  | "star"
  | "graduation"
  | "heart"
  | "tree"
  | "flag"
  | "ghost"
  | "sun"
  | "leaf"
  | "snowflake"
  | "egg"
  | "drum";

export interface EventDate {
  month: number;
  day: number;
}

export interface Event {
  id: string;
  title: string;
  message: string;
  mobileMessage?: string;
  iconName: EventIconName;
  startDate: EventDate;
  endDate?: EventDate;
  bgGradient: string;
  showConfetti?: boolean;
}
