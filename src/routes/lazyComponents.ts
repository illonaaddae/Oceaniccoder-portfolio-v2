import { lazyWithReload } from "@/utils/lazyWithReload";

// Eager load critical home components for instant display
import Home from "@/components/HeroSection";
import Skills from "@/components/SkillsSection";
import Projects from "@/components/ProjectsSection";
import Testimonials from "@/components/TestimonialsSection";

// Lazy load non-critical route components.
//
// lazyWithReload (not React.lazy) so a tab left open across a deploy recovers by
// itself instead of dropping the visitor on "Something went wrong" — the old
// chunk hash it still points at was deleted by the deploy. See the helper for
// the full explanation.
const About = lazyWithReload("AboutSection", () => import("@/components/AboutSection"));
const Services = lazyWithReload("ServicesSection", () => import("@/components/ServicesSection"));
const Contact = lazyWithReload("ContactSection", () => import("@/components/ContactSection"));
const ProjectCaseStudy = lazyWithReload(
  "ProjectCaseStudy",
  () => import("@/components/ProjectCaseStudy"),
);
const Blog = lazyWithReload("BlogSection", () => import("@/components/BlogSection"));
const BlogPost = lazyWithReload("BlogPost", () => import("@/components/BlogPost"));
const AdminDashboard = lazyWithReload(
  "AdminDashboard",
  () => import("@/components/AdminDashboard"),
);
const AdminPasswordReset = lazyWithReload(
  "AdminPasswordReset",
  () => import("@/components/AdminPasswordReset"),
);
const NotFound = lazyWithReload("NotFound", () => import("@/components/NotFound"));
const Booking = lazyWithReload("BookingSection", () => import("@/components/BookingSection"));
const ClientInquiry = lazyWithReload(
  "InquiryPage",
  () => import("@/components/ClientInquiry/InquiryPage"),
);
const PaymentPage = lazyWithReload("PaymentPage", () => import("@/components/Payment/PaymentPage"));

/**
 * Route chunks worth warming on idle, so an open tab already holds them in the
 * module registry before a deploy deletes the files they point at. See
 * prefetchRoutes for the reasoning.
 *
 * Public routes only. The admin bundle is the largest chunk in the build and is
 * useless to the visitors who make up nearly all traffic, so it is left out —
 * lazyWithReload still covers it.
 */
export const PREFETCHABLE_ROUTES: (() => Promise<unknown>)[] = [
  // Ordered by how costly the failure is: losing a payment or a lead matters
  // more than a slow About page.
  () => import("@/components/Payment/PaymentPage"),
  () => import("@/components/ClientInquiry/InquiryPage"),
  () => import("@/components/BookingSection"),
  () => import("@/components/ContactSection"),
  () => import("@/components/ServicesSection"),
  () => import("@/components/AboutSection"),
  () => import("@/components/BlogSection"),
  () => import("@/components/BlogPost"),
  () => import("@/components/ProjectCaseStudy"),
  () => import("@/components/NotFound"),
];

export {
  Home,
  Skills,
  Projects,
  Testimonials,
  About,
  Services,
  Contact,
  ProjectCaseStudy,
  Blog,
  BlogPost,
  AdminDashboard,
  AdminPasswordReset,
  NotFound,
  Booking,
  ClientInquiry,
  PaymentPage,
};
