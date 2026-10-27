import React from "react";
import { Route } from "react-router-dom";
import PageWrapper from "@/components/PageWrapper";
import LoadingSpinner from "@/components/LoadingSpinner";
import { QuoteRouteFallback } from "@/components/Quote/QuoteShell";
import {
  Home,
  AIJourney,
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
  Privacy,
  Booking,
  ClientInquiry,
  PaymentPage,
  QuotePage,
  CheckoutPage,
  PaidPage,
  StageInvoicePage,
  ReceiptPage,
} from "./lazyComponents";

const Fallback = () => <LoadingSpinner />;

const publicRoutes = (
  <>
    <Route
      path="/"
      element={
        <PageWrapper>
          <Home />
          <AIJourney />
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
      path="/booking"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <Booking />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="/inquiry"
      element={
        <React.Suspense fallback={<Fallback />}>
          <ClientInquiry />
        </React.Suspense>
      }
    />
    <Route
      path="/privacy"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PageWrapper>
            <Privacy />
          </PageWrapper>
        </React.Suspense>
      }
    />
    <Route
      path="/pay/:invoiceNumber"
      element={
        <React.Suspense fallback={<Fallback />}>
          <PaymentPage />
        </React.Suspense>
      }
    />
    <Route
      path="/q/:token"
      element={
        <React.Suspense fallback={<QuoteRouteFallback />}>
          <QuotePage />
        </React.Suspense>
      }
    />
    <Route
      path="/q/:token/pay/:stageId"
      element={
        <React.Suspense fallback={<QuoteRouteFallback />}>
          <CheckoutPage />
        </React.Suspense>
      }
    />
    <Route
      path="/q/:token/paid"
      element={
        <React.Suspense fallback={<QuoteRouteFallback />}>
          <PaidPage />
        </React.Suspense>
      }
    />
    <Route
      path="/q/:token/invoice/:stageId"
      element={
        <React.Suspense fallback={<QuoteRouteFallback />}>
          <StageInvoicePage />
        </React.Suspense>
      }
    />
    <Route
      path="/receipt/:reference"
      element={
        <React.Suspense fallback={<QuoteRouteFallback />}>
          <ReceiptPage />
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
