import React from "react";

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="relative">
      <div className="w-12 h-12 rounded-full border-4 border-oceanic-500/20 border-t-oceanic-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  </div>
);

export default LoadingSpinner;
