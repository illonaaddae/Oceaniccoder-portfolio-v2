import React from "react";

// Eager load critical home components for instant display
import Home from "@/components/HeroSection";
import Skills from "@/components/SkillsSection";
import Projects from "@/components/ProjectsSection";
import Testimonials from "@/components/TestimonialsSection";

// Lazy load non-critical route components
const About = React.lazy(() => import("@/components/AboutSection"));
const Services = React.lazy(() => import("@/components/ServicesSection"));
const Contact = React.lazy(() => import("@/components/ContactSection"));
const ProjectCaseStudy = React.lazy(() => import("@/components/ProjectCaseStudy"));
const Blog = React.lazy(() => import("@/components/BlogSection"));
const BlogPost = React.lazy(() => import("@/components/BlogPost"));
const AdminDashboard = React.lazy(() => import("@/components/AdminDashboard"));
const AdminPasswordReset = React.lazy(() => import("@/components/AdminPasswordReset"));
const NotFound = React.lazy(() => import("@/components/NotFound"));
const Booking = React.lazy(() => import("@/components/BookingSection"));
const ClientInquiry = React.lazy(() => import("@/components/ClientInquiry/InquiryPage"));
const PaymentPage = React.lazy(() => import("@/components/Payment/PaymentPage"));

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
