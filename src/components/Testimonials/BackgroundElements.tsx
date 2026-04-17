import React from "react";

const BackgroundElements: React.FC = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="liquid-morph absolute top-20 right-20 w-96 h-96 bg-gradient-to-r from-oceanic-500/8 to-blue-500/10 blur-3xl" />
    <div className="liquid-morph absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-oceanic-500/6 to-blue-500/8 blur-3xl" />
  </div>
));

BackgroundElements.displayName = "BackgroundElements";

export default BackgroundElements;
