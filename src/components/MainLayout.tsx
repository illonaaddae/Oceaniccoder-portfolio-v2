import React, { FC } from "react";
import { useLocation } from "react-router-dom";
import SkipToContent from "./SkipToContent";
import EventBanner from "./EventBanner";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ScrollToTop from "./ScrollToTop";
import SupportButton from "./SupportButton";

interface MainLayoutProps {
  theme: string;
  toggleTheme: () => void;
  children: React.ReactNode;
}

/** Client documents (quotes, invoice pay pages, receipts), which bring their own small header. */
export const isClientDocumentPath = (pathname: string) =>
  pathname.startsWith("/q/") || pathname.startsWith("/pay/") || pathname.startsWith("/receipt/");

const MainLayout: FC<MainLayoutProps> = ({ theme, toggleTheme, children }) => {
  const location = useLocation();
  // Admin pages and client documents bring their own frame; the marketing
  // navbar, banner and footer would only distract.
  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/dashboard" ||
    isClientDocumentPath(location.pathname);

  return (
    <>
      {!isAdminRoute && <SkipToContent />}
      {!isAdminRoute && <EventBanner />}
      {!isAdminRoute && <Navbar theme={theme} toggleTheme={toggleTheme} />}
      <main id="main-content" tabIndex={-1} className="outline-none">
        {children}
      </main>
      {!isAdminRoute && <Footer theme={theme} />}
      {!isAdminRoute && <ScrollToTop />}
      {!isAdminRoute && <SupportButton />}
    </>
  );
};

export default MainLayout;
