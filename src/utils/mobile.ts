/**
 * Mobile detection and utilities
 */

/**
 * Check if device is mobile
 */
export const isMobile = (): boolean => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if device is touch device
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
};

/**
 * Get viewport dimensions
 */
export const getViewportSize = () => {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
};

/**
 * Check if viewport is mobile size
 */
export const isMobileViewport = (): boolean => {
  const { width } = getViewportSize();
  return width <= 768;
};

/**
 * Check if viewport is tablet size
 */
export const isTabletViewport = (): boolean => {
  const { width } = getViewportSize();
  return width > 768 && width <= 1024;
};

/**
 * Check if viewport is desktop size
 */
export const isDesktopViewport = (): boolean => {
  const { width } = getViewportSize();
  return width > 1024;
};

/**
 * Handle orientation change
 */
export const onOrientationChange = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("orientationchange", callback);
  window.addEventListener("resize", callback);

  return () => {
    window.removeEventListener("orientationchange", callback);
    window.removeEventListener("resize", callback);
  };
};

/**
 * Prevent zoom on double tap (mobile)
 */
export const preventDoubleTapZoom = () => {
  if (!isTouchDevice()) return;

  let lastTouchEnd = 0;
  document.addEventListener(
    "touchend",
    (event) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    false
  );
};

/**
 * Lock screen orientation (mobile)
 */
export const lockOrientation = async (
  orientation: "portrait" | "landscape" | "any"
) => {
  const orientationObj = (screen as any)?.orientation;
  if (!orientationObj || typeof orientationObj.lock !== "function") return;


  try {
        await orientationObj.lock?.(orientation);
  } catch (error) {
    console.warn("Failed to lock orientation:", error);
  }
};

