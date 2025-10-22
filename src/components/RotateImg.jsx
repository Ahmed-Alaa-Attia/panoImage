import { useEffect, useState } from "react";

export default function RotateImg() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Keep JS behavior aligned with Tailwind's sm breakpoint
    const mql = window.matchMedia("(max-width: 639.98px)");
    const onChange = (e) => setIsMobile(e.matches);

    setIsMobile(mql.matches); // initial
    mql.addEventListener?.("change", onChange);
    mql.addListener?.(onChange); // Safari fallback

    return () => {
      mql.removeEventListener?.("change", onChange);
      mql.removeListener?.(onChange);
    };
  }, []);

  /* -----------------------------
   * 2) Tilt mapping state
   * posPct: 0..100 -> background-position-x (0=left, 50=center, 100=right)
   * motionReady: we can read sensors (iOS needs a tap)
   * ----------------------------- */
  const [posPct, setPosPct] = useState(50);
  const [motionReady, setMotionReady] = useState(false);

  /* -----------------------------
   * 3) Helpers: read a consistent "left↔right tilt" across orientations
   * - Portrait: gamma behaves as left/right
   * - Landscape: beta behaves as left/right; we fix the sign using window.orientation
   * Result: value acts like gamma in −90..+90 (left..right)
   * ----------------------------- */
  const getLeftRightTilt = (e) => {
    // Detect landscape using either legacy window.orientation or media query
    const isLandscape =
      (typeof window.orientation === "number" &&
        Math.abs(window.orientation) === 90) ||
      window.matchMedia?.("(orientation: landscape)")?.matches;

    // In portrait we use gamma; in landscape we use beta (acts as left/right)
    let g = isLandscape ? e.beta ?? 0 : e.gamma ?? 0;

    // On iOS, window.orientation is 90 for landscape-right and -90 for landscape-left
    // Flip sign in landscape-right so left↔right feels natural
    if (isLandscape) {
      const angle =
        typeof window.orientation === "number" ? window.orientation : 0;
      g = angle === 90 ? -g : g;
      // keep within sensible bounds
      if (g > 90) g = 90;
      if (g < -90) g = -90;
    }

    return g; // −90 (left) .. +90 (right)
  };

  /* -----------------------------
   * 4) Map tilt degrees → background-position percentage
   * - Direct map: −90..+90  →  0..100
   * ----------------------------- */
  const gammaToPos = (gamma = 0) => ((gamma + 90) / 180) * 100;

  // Tuning knobs:
  const SMOOTH = 0.15; // 0..1, higher = snappier, lower = smoother
  const DEAD = 1.5; // degrees ignored to reduce jitters (set to 0 to disable)

  /* -----------------------------
   * 5) Device orientation listener (mobile only, after permission)
   * - Applies dead-zone and exponential smoothing for fluid motion
   * ----------------------------- */
  useEffect(() => {
    if (!isMobile || !motionReady) return;

    const onOrient = (e) => {
      // Read a stable left↔right tilt across orientations
      const g = getLeftRightTilt(e);

      // Optional dead-zone to ignore micro shakes around 0°
      if (Math.abs(g) < DEAD) return;

      // Compute target position (0..100), then smooth toward it
      const target = gammaToPos(g);
      setPosPct((prev) => prev + (target - prev) * SMOOTH);
    };

    // Passive listener is enough; capture not needed
    window.addEventListener("deviceorientation", onOrient, { passive: true });

    // Initialize once so we don't wait for the first event (centered)
    onOrient({ gamma: 0, beta: 0 });

    return () => {
      window.removeEventListener("deviceorientation", onOrient, {
        passive: true,
      });
    };
  }, [isMobile, motionReady]);

  /* -----------------------------
   * 6) iOS 13+ motion permission (must be triggered by user gesture)
   * After granting, start receiving deviceorientation events.
   * ----------------------------- */
  const requestIOSPermission = async () => {
    try {
      const DME = window.DeviceMotionEvent;
      const DOE = window.DeviceOrientationEvent;

      if (DME && typeof DME.requestPermission === "function") {
        const r = await DME.requestPermission();
        if (r === "granted") setMotionReady(true);
      } else if (DOE && typeof DOE.requestPermission === "function") {
        const r = await DOE.requestPermission();
        if (r === "granted") setMotionReady(true);
      } else {
        // Android/others usually allow over HTTPS
        setMotionReady(true);
      }
    } catch {
      // denied or not available; background will remain static
      setMotionReady(false);
    }
  };

  return (
    <div className="relative w-screen h-dvh">
      {/* DESKTOP (≥ sm): show 1920×1080 hero (cover the viewport) */}
      <img
        src="./testImg.jpg"
        alt=""
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
      />

      {/* MOBILE (< sm): pano as background, driven by tilt */}
      <div
        className="block sm:hidden w-full h-full overflow-hidden"
        style={{
          backgroundImage: 'url("./panorama.jpg")', // your equirectangular/very wide pano
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto 100%", // fill height; extra width becomes pannable content
          backgroundPosition: `${posPct}% 50%`, // 0..100 horizontally, centered vertically
          // You can keep or remove this; we already smooth in JS.
          transition: "background-position 120ms ease-out",
        }}
      />

      {/* iOS: enable motion (shown only on mobile until permission granted) */}
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
