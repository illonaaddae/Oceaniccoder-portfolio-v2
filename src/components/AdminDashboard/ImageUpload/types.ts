export interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
  theme?: "light" | "dark";
  allowPdf?: boolean;
  /** Pass true if the current value is a PDF */
  isPdfValue?: boolean;
}
