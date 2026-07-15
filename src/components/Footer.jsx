import React from "react";
import FooterBrand from "./Footer/FooterBrand";
import FooterLinks from "./Footer/FooterLinks";
import SocialLinks from "./Footer/SocialLinks";
import Copyright from "./Footer/Copyright";
import BackToTop from "./Footer/BackToTop";
import FooterQuote from "./Footer/FooterQuote";

const Footer = ({ theme }) => {
  return (
    <footer className="relative bg-gradient-to-t from-black/50 to-transparent">
      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <FooterBrand theme={theme} />
          <FooterLinks />
          <SocialLinks />
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 my-8"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Copyright />
          <BackToTop />
        </div>

        <FooterQuote />
      </div>
    </footer>
  );
};

export default Footer;
