import React from "react";

const AboutBackground = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="liquid-morph absolute top-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/8 to-pink-500/10 blur-3xl"></div>
    <div className="liquid-morph absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-green-500/6 to-oceanic-500/8 blur-3xl"></div>
    <div className="liquid-morph absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-r from-blue-500/4 to-purple-500/6 blur-2xl"></div>
  </div>
));

AboutBackground.displayName = "AboutBackground";
export default AboutBackground;
