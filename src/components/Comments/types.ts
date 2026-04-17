export type { Comment } from "../../types";

export interface BlogCommentsProps {
  postId: string;
  isDark?: boolean;
}

export interface CommentFormState {
  authorName: string;
  authorEmail: string;
  content: string;
}

export interface ToastState {
  type: "success" | "error";
  message: string;
}

export interface StyleVars {
  cardStyles: string;
  textPrimary: string;
  textSecondary: string;
  textAccent: string;
  inputStyles: string;
}
