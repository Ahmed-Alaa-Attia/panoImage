import Pannellum from "pannellum";
import "pannellum/build/pannellum.css";
import { useEffect, useRef, useState } from "react";

export default function RotatePanoResponsive({
  desktopSrc = "/testImg.jpg",
  panoSrc = "/panorama.jpg",
  initialYaw = 0,
  initialPitch = 0,
  initialHfov = 90,
}) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Keep JS behavior in sync with Tailwind's sm breakpoint
    const mql = window.matchMedia("(max-width: 639.98px)");
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mql.matches); // initial value
    mql.addEventListener?.("change", onChange);
    mql.addListener?.(onChange); // Safari fallback

    return () => {
      mql.removeEventListener?.("change", onChange);
      mql.removeListener?.(onChange);
    };
  }, []);

  // ---- 2) Pannellum refs/state ----
  const panoRef = useRef(null); // div container for Pannellum
  const viewerRef = useRef(null); // holds the Pannellum viewer instance
  const [motionReady, setMotionReady] = useState(false); // device motion permission on iOS

  // ---- 3) Create/destroy the Pannellum viewer when on mobile ----
  useEffect(() => {
    // Only mount the viewer on mobile and when the container exists
    if (!isMobile || !panoRef.current) return;

    // Create the viewer
    viewerRef.current = Pannellum.viewer(panoRef.current, {
      type: "equirectangular", // Pannellum expects equirectangular pano
      panorama: panoSrc, // your pano image path
      autoLoad: true, // load immediately
      yaw: initialYaw, // starting yaw (left/right)
      pitch: initialPitch, // starting pitch (up/down)
      hfov: initialHfov, // starting zoom (80–100 good; smaller = more zoom)
      showControls: true, // UI controls (fullscreen, zoom, etc.)
      mouseZoom: true, // pinch/scroll zoom
      orientationOnByDefault: true, // if permission is already given, use gyro on load
    });

    // Cleanup on unmount / when switching away from mobile
    return () => {
      try {
        viewerRef.current?.destroy();
      } catch (e) {
        console.log(e);
      }
      viewerRef.current = null;
    };
  }, [isMobile, panoSrc, initialYaw, initialPitch, initialHfov]);

  // ---- 4) iOS 13+ motion permission + start orientation on success ----
  const requestIOSPermission = async () => {
    try {
      const DME = window.DeviceMotionEvent;
      const DOE = window.DeviceOrientationEvent;

      // Ask user only if the API is present (iOS)
      if (DME && typeof DME.requestPermission === "function") {
        const r = await DME.requestPermission();
        if (r === "granted") setMotionReady(true);
      } else if (DOE && typeof DOE.requestPermission === "function") {
        const r = await DOE.requestPermission();
        if (r === "granted") setMotionReady(true);
      } else {
        // Android / other browsers (often fine over HTTPS)
        setMotionReady(true);
      }

      // If supported, engage orientation control
      if (viewerRef.current?.isOrientationSupported?.()) {
        viewerRef.current.startOrientation();
      }
    } catch {
      // User denied or not supported — touch pan still works
    }
  };

  // ---- 5) Render ----
  return (
    <div className="relative w-screen h-dvh">
      {/* DESKTOP (≥ sm): show your 1920x1080 hero image */}
      <img
        src={desktopSrc}
        alt=""
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
      />

      {/* MOBILE (< sm): Pannellum viewer fills the viewport */}
      <div className="block sm:hidden w-full h-full">
        <div ref={panoRef} className="w-full h-full" />
      </div>

      {/* iOS motion permission button (mobile only, show until granted) */}
      {isMobile && !motionReady && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={requestIOSPermission}
            className="px-4 py-2 rounded-xl bg-black/70 text-white text-sm backdrop-blur shadow"
          >
            Enable Motion Control
          </button>
        </div>
      )}
    </div>
  );
}
