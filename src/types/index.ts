// Project Types
export interface Project {
  $id: string;
  title: string;
  description: string;
  longDescription?: string;
  category: string;
  technologies: string[];
  image?: string;
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
  status?: string;
  year?: string;
}

// Certification Types
export interface Certification {
  $id: string;
  title: string;
  issuer: string;
  date: string;
  credential?: string;
  skills?: string[];
  platform: string;
  downloadLink?: string;
  verifyLink?: string;
  platformColor?: string;
  image?: string;
}

// Education Types
export interface Education {
  $id: string;
  institution: string;
  degree: string;
  period: string;
  field?: string;
  achievement?: string;
  description?: string;
  universityLogo?: string;
  logo?: string;
  gpa?: string;
}

// About Types
export interface About {
  $id: string;
  title?: string;
  subtitle?: string;
  story?: string;
  profileImage?: string;
  resumeUrl?: string;
}

// Gallery Types
export interface GalleryImage {
  $id: string;
  src: string;
  alt: string;
  caption?: string;
  order?: number;
}

// Blog Post Types
export interface BlogPost {
  $id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category?: string;
  tags?: string[];
  publishedAt?: string;
  readTime?: string;
  image?: string;
  featured?: boolean;
  published?: boolean;
}

// Comment Types
export interface Comment {
  $id: string;
  postId: string;
  userId?: string;
  authorName: string;
  authorEmail?: string;
  content: string;
  isApproved?: boolean;
  parentId?: string;
  $createdAt?: string;
}

// Journey Types
export interface Journey {
  $id: string;
  role: string;
  company: string;
  period: string;
  location?: string;
  description?: string;
  achievements?: string[];
  logo?: string;
  link?: string;
  color?: string;
  order?: number;
}

// Message Types
export interface Message {
  $id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status?: "new" | "read" | "replied";
  $createdAt?: string;
}

// Skill Types
export interface Skill {
  $id: string;
  name: string;
  percentage: number;
  category?: string;
  icon?: string;
  $createdAt?: string;
}

// API Response Types
export interface AppwriteResponse<T> {
  total: number;
  documents: T[];
}

// Settings Types
export interface Settings {
  $id: string;
  key: string;
  value: string;
  $createdAt?: string;
  $updatedAt?: string;
}
