import React from "react";

const BackgroundElements = React.memo(function BackgroundElements() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="liquid-morph absolute top-10 left-10 w-96 h-96 bg-gradient-to-r from-oceanic-500/10 to-blue-500/12 blur-3xl"></div>
      <div className="liquid-morph absolute bottom-10 right-10 w-80 h-80 bg-gradient-to-r from-purple-500/8 to-oceanic-500/10 blur-3xl"></div>
      <div className="liquid-morph absolute top-1/2 left-1/3 w-72 h-72 bg-gradient-to-r from-green-500/6 to-blue-500/8 blur-2xl"></div>
    </div>
  );
});

export default BackgroundElements;
