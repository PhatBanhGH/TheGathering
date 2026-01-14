import { lazy, Suspense, ComponentType, LazyExoticComponent } from "react";

/**
 * Lazy loading utilities for code splitting
 */

// Lazy load components (type-erased to avoid props inference issues)
const lazyAny = (loader: () => Promise<{ default: ComponentType<any> }>): LazyExoticComponent<ComponentType<any>> =>
  lazy(loader) as LazyExoticComponent<ComponentType<any>>;

export const LazyEventModal = lazyAny(() => import("../components/modals/EventModal"));
export const LazySettingsModal = lazyAny(
  () => import("../components/modals/SettingsModal")
);
export const LazyNotificationPanel = lazyAny(
  () => import("../components/NotificationCenter")
);
export const LazyWhiteboard = lazyAny(() => import("../components/editor/Whiteboard"));

/**
 * Loading fallback component
 */
export const LoadingFallback = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      color: "#9ca3af",
    }}
  >
    Loading...
  </div>
);

/**
 * HOC for lazy loading with Suspense
 */
export const withLazyLoad = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => (
    <Suspense fallback={<LoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
};
