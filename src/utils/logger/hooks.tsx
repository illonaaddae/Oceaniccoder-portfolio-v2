/**
 * React Performance Hooks for Logger
 * @module utils/logger/hooks
 */

import React from "react";
import { logger } from "./Logger";

/**
 * React hook for tracking component performance
 */
export const usePerformanceTracking = (componentName: string) => {
  const mountTime = performance.now();

  React.useEffect(() => {
    const duration = performance.now() - mountTime;
    logger.trackPerformance(`${componentName} mount`, duration);

    return () => {
      logger.debug(`${componentName} unmounted`);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

/**
 * Higher-order component for performance tracking
 */
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
) => {
  const displayName =
    componentName ||
    WrappedComponent.displayName ||
    WrappedComponent.name ||
    "Component";

  const WithPerformanceTracking: React.FC<P> = (props) => {
    usePerformanceTracking(displayName);
    return <WrappedComponent {...props} />;
  };

  WithPerformanceTracking.displayName = `WithPerformanceTracking(${displayName})`;
  return WithPerformanceTracking;
};
