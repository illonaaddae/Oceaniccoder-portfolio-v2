import React from "react";

const LoadingState: React.FC = () => (
  <section className="py-20 relative overflow-hidden">
    <div className="container mx-auto px-6">
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-oceanic-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  </section>
);

export default LoadingState;
