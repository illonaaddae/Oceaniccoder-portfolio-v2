import React from "react";
import { Route } from "react-router-dom";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
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
  NotFound,
} from "./lazyComponents";

const Fallback = () => <LoadingSpinner />;

const publicRoutes = (
  <>
    <Route
      path="/"
      element={
        <PageWrapper>
          <Home />
          <Skills />
          <Projects />
          <Testimonials />
        </PageWrapper>
      }
    />
    <Route
      path="/about"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <About />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="/skills"
      element={
        <PageWrapper>
          <Skills />
        </PageWrapper>
      }
    />
    <Route
      path="/projects"
      element={
        <PageWrapper>
          <Projects />
        </PageWrapper>
      }
    />
    <Route
      path="/projects/:slug"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <ProjectCaseStudy />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="/services"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <Services />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="/blog"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <Blog />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="/blog/:slug"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <BlogPost />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="/contact"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <Contact />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="*"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <NotFound />
          </PageWrapper>
        </React.Suspense>
      }
    />
  </>
);

export default publicRoutes;
