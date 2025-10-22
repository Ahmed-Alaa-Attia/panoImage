import { useEffect, useRef, useState } from "react";

const RotateImg = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [posPct, setPosPct] = useState(50);
  const [motionReady, setMotionReady] = useState(false);
  const maxTiltDeg = 30;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const gammaToPos = (gamma) => {
    const g = clamp(gamma ?? 0, -maxTiltDeg, maxTiltDeg);
    const norm = (g + maxTiltDeg) / (2 * maxTiltDeg);
    return norm * 100;
  };

  const requestIOSPermission = async () => {
    try {
      const DME = window.DeviceMotionEvent;
      const DOE = window.DeviceOrientationEvent;
      if (DME && typeof DME.requestPermission === "function") {
        const r = await DME.requestPermission();
        if (r === "granted") setMotionReady(true);
        return;
      }
      if (DOE && typeof DOE.requestPermission === "function") {
        const r = await DOE.requestPermission();
        if (r === "granted") setMotionReady(true);
        return;
      }
      setMotionReady(true);
    } catch {
      setMotionReady(false);
    }
  };

  /* =========================
     ✨ Smooth tween additions
     ========================= */
  const targetRef = useRef(50); // where we want to go (0..100)
  const posRef = useRef(50); // current animated position (0..100)
  const RAF_TAU = 0.33; // time constant (seconds). ~3*tau ≈ time to ~95% → ~1s
  const rafIdRef = useRef(null);

  // Start the rAF loop once on mount
  useEffect(() => {
    let last = performance.now();

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;

      // Exponential smoothing: alpha = 1 - exp(-dt/tau)
      const alpha = 1 - Math.exp(-dt / RAF_TAU);

      // Move pos toward target with time-based smoothing
      posRef.current =
        posRef.current + (targetRef.current - posRef.current) * alpha;

      // Push to React state (rounded a bit to reduce tiny re-renders)
      setPosPct((prev) => {
        const next = posRef.current;
        // avoid extra renders if change is negligible
        return Math.abs(next - prev) < 0.05 ? prev : next;
      });

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // Keep posRef in sync if posPct changes externally (initial state etc.)
  useEffect(() => {
    posRef.current = posPct;
    targetRef.current = posPct;
  }, []); // run once

  useEffect(() => {
    if (!isMobile || !motionReady) return;
    const onOrient = (e) => {
      const gamma = e.gamma || 0;
      // 🚀 instead of snapping, just update the target
      targetRef.current = gammaToPos(gamma);
    };
    window.addEventListener("deviceorientation", onOrient, true);
    return () =>
      window.removeEventListener("deviceorientation", onOrient, true);
  }, [isMobile, motionReady]);

  return (
    <div className="relative w-screen h-dvh">
      <img
        src="./testImg.jpg"
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
      />

      <div
        className="block sm:hidden w-full h-full overflow-hidden will-change-transform"
        style={{
          backgroundImage: 'url("./panorama.jpg")',
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto 100%",
          backgroundPosition: `${posPct}% 50%`,
          // optional: you can keep this subtle or remove it since we're animating in JS
          transition: "background-position 60ms linear",
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
};

export default RotateImg;
