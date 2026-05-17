import React from "react";
import { useLocation } from "react-router-dom";
import ErrorBoundary from "./ErrorBoundary";

const RouteErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
};

export default RouteErrorBoundary;
