import { useEffect, useState } from "react";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const RotateImg = () => {
  // --- Desktop vs mobile (match Tailwind sm = 640px) ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --- Pano position (0..100) + iOS permission flag ---
  const [posPct, setPosPct] = useState(50);
  const [motionReady, setMotionReady] = useState(false);

  // iOS 13+ permission gate (kept as-is)
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

  // --- Rotation-rate → pan (Y axis only) ---
  // Tuning knobs
  const ROT_GAIN = 0.03; // how much each deg/s nudges the pano per event
  const ROT_DEAD = 0.5; // ignore tiny rotation rates (deg/s)
  const SENSE = 1; // set to -1 if direction feels inverted on your device

  useEffect(() => {
    if (!isMobile || !motionReady) return;

    const onMotion = (e) => {
      const rr = e.rotationRate || {};
      // rotation around Y axis (deg/s). Spec calls this "gamma" in rotationRate.
      const yRate = rr.gamma ?? 0;

      if (Math.abs(yRate) < ROT_DEAD) return;

      // incrementally move background based on rotation rate
      setPosPct((prev) => {
        const next = prev + SENSE * yRate * ROT_GAIN;
        return clamp(next, 0, 100);
      });
    };

    window.addEventListener("devicemotion", onMotion, { passive: true });

    return () => {
      window.removeEventListener("devicemotion", onMotion, { passive: true });
    };
  }, [isMobile, motionReady]);

  return (
    <div className="relative w-screen h-dvh">
      {/* Desktop: 1920×1080 hero */}
      <img
        src="./testImg.jpg"
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
        alt=""
      />

      {/* Mobile: pano background driven by rotation (no tilt) */}
      <div
        className="block sm:hidden w-full h-full overflow-hidden will-change-transform"
        style={{
          backgroundImage: 'url("./testImg.jpg")', // use a wider pano if you have one
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto 100%",
          backgroundPosition: `${posPct}% 50%`,
          // keep this short/linear so it doesn't fight the incremental updates
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
