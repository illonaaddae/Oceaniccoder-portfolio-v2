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

const MainLayout: FC<MainLayoutProps> = ({ theme, toggleTheme, children }) => {
  const location = useLocation();
  const isAdminRoute =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/dashboard";

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
