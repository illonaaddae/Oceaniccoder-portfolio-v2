import { BlogPost } from "@/types";

export interface BlogTabProps {
  blogPosts: BlogPost[];
  onAdd: (post: Partial<BlogPost>) => Promise<void>;
  onEdit: (id: string, post: Partial<BlogPost>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
  theme?: "light" | "dark";
  isReadOnly?: boolean;
}

export interface ThemeProps {
  theme: "light" | "dark";
}
