// RotateImg.jsx
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function RotateImg() {
  // --- Desktop vs mobile (align with Tailwind sm = 640px) ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639.98px)");
    const onChange = (e) => setIsMobile(e.matches);
    setIsMobile(mql.matches);
    mql.addEventListener?.("change", onChange);
    mql.addListener?.(onChange);
    return () => {
      mql.removeEventListener?.("change", onChange);
      mql.removeListener?.(onChange);
    };
  }, []);

  // --- iOS permission ---
  const [motionReady, setMotionReady] = useState(false);
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
        setMotionReady(true);
      }
    } catch {
      setMotionReady(false);
    }
  };

  // --- Tilt mapping: small tilts map to full pan ---
  const maxTiltDeg = 30; // user tilts ±30° to reach the ends
  const gammaToPos = (gamma = 0) => {
    const g = clamp(gamma, -maxTiltDeg, maxTiltDeg);
    const norm = (g + maxTiltDeg) / (2 * maxTiltDeg); // 0..1
    return norm * 100; // 0..100 (%)
  };

  // --- GSAP-controlled CSS var on the mobile pane ---
  const mobilePaneRef = useRef(null);
  const quickToRef = useRef(null);

  // initialize the CSS var and create the GSAP quickTo setter when mobile pane mounts
  useEffect(() => {
    if (!isMobile || !mobilePaneRef.current) return;
    // set initial position to center (50%)
    gsap.set(mobilePaneRef.current, { "--panX": "50%" });

    // create a quickTo for the CSS variable --panX
    quickToRef.current = gsap.quickTo(mobilePaneRef.current, "--panX", {
      duration: 1, // ≈ time to reach target (tweak: 0.6–1.2)
      ease: "power3.out", // smooth, ScrollSmoother-like
      // You can also use overwrite: "auto" if you want to cancel prior tweens
    });
  }, [isMobile]);

  // --- Device orientation listener: set GSAP target, not React state ---
  useEffect(() => {
    if (!isMobile || !motionReady || !quickToRef.current) return;

    const DEAD = 1.2; // degrees; ignore tiny jitters
    const onOrient = (e) => {
      const gamma = e.gamma ?? 0; // left/right tilt
      if (Math.abs(gamma) < DEAD) return;

      const target = clamp(gammaToPos(gamma), 0, 100); // map → 0..100
      // tween the CSS var toward the new target (GSAP handles the glide)
      quickToRef.current(`${target}%`);
    };

    window.addEventListener("deviceorientation", onOrient, { passive: true });

    // set a starting target so it doesn't wait for first event
    quickToRef.current("50%");

    return () =>
      window.removeEventListener("deviceorientation", onOrient, {
        passive: true,
      });
  }, [isMobile, motionReady]);

  return (
    <div className="relative w-screen h-dvh">
      {/* DESKTOP: 1920x1080 hero */}
      <img
        src="./testImg.jpg"
        alt=""
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
      />

      {/* MOBILE: pano background driven by CSS var --panX (tweened by GSAP) */}
      <div
        ref={mobilePaneRef}
        className="block sm:hidden w-full h-full overflow-hidden will-change-transform"
        style={{
          backgroundImage: 'url("./panorama.jpg")',
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto 100%",
          // Use the CSS variable for background-position-x
          backgroundPosition: "var(--panX, 50%) 50%",
          // We let GSAP do the easing; keep CSS transition off (or very small) to avoid fighting
          transition: "none",
        }}
      />

      {/* iOS: enable motion */}
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
