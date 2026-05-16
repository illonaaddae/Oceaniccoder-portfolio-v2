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
  demoVideoUrl?: string;
  featured?: boolean;
  status?: string;
  year?: string;
  slug?: string;
  // Case Study fields
  challenge?: string;
  solution?: string;
  results?: string;
  timeline?: string;
  role?: string;
  teamSize?: string;
  screenshots?: string[];
  keyFeatures?: string[];
  lessonsLearned?: string;
  $createdAt?: string;
  $updatedAt?: string;
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
  platformIconUrl?: string;
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
  classHonours?: string;
  startDate?: string;
  endDate?: string;
  isOngoing?: boolean;
  initials?: string;
  location?: string;
  isVisible?: boolean;
}

// About Types
export interface About {
  $id: string;
  title?: string;
  subtitle?: string;
  story?: string;
  profileImage?: string;
  resumeUrl?: string;
  // Stats (editable from dashboard)
  studentsMentored?: number;
  techTalks?: number;
  yearsExperience?: number;
}

// Gallery Types
export interface GalleryImage {
  $id: string;
  src: string;
  alt: string;
  caption?: string;
  order?: number;
  isPublic?: boolean;
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
  likes?: number;
  dislikes?: number;
}

// Blog Reaction Types
export interface BlogReaction {
  $id: string;
  postId: string;
  visitorId: string;
  reaction: "like" | "dislike";
  $createdAt?: string;
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

// Project Inquiry Types
export interface ProjectInquiry {
  $id: string;
  name: string;
  email: string;
  phone?: string;
  projectType: string;
  description: string;
  features?: string[];
  timeline?: string;
  budgetRange?: string;
  notes?: string;
  hasLogo?: boolean;
  needsDomain?: boolean;
  domainExtension?: string;
  needsHosting?: boolean;
  status: "new" | "reviewed" | "quoted" | "declined";
  $createdAt?: string;
  $updatedAt?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  $id: string;
  inquiryId?: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  items: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  status: "draft" | "sent" | "paid";
  dueDate?: string;
  estimatedDelivery?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

// Expense Types
export interface Expense {
  $id: string;
  description: string;
  amount: number;
  currency: string;
  category: "domain" | "hosting" | "tools" | "software" | "other";
  date: string;
  $createdAt?: string;
}

// Payment Types
export interface Payment {
  $id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  currency: string;
  method: "card" | "momo" | "bank_transfer";
  paystackReference?: string;
  status: "pending" | "success" | "failed";
  paidAt?: string;
  $createdAt?: string;
}

// Testimonial Types
export interface Testimonial {
  $id: string;
  name: string;
  role: string;
  company?: string;
  content: string;
  image?: string;
  rating?: number;
  featured?: boolean;
  order?: number;
  $createdAt?: string;
}
