import type { GalleryImage } from "@/types";

export interface GalleryFormState {
  src: string;
  alt: string;
  caption: string;
  order: number;
  isPublic: boolean;
}

export interface GalleryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (image: Omit<GalleryImage, "$id">) => Promise<void>;
  theme: "light" | "dark";
  editingImage?: GalleryImage | null;
  totalImages?: number;
}
