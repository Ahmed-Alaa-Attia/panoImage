import { useOrientation } from "@uidotdev/usehooks";
import { useEffect, useRef, useState } from "react";
import useGyroscope from "react-hook-gyroscope";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function RotateImg() {
  /* 1) breakpoint alignment with Tailwind sm */
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* 2) pano position (0..100) and iOS permission gate */
  const [posPct, setPosPct] = useState(50);
  const [motionReady, setMotionReady] = useState(false);

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

  /* 3) motion source: gyroscope (rotation rates, rad/s) */
  const gyro = useGyroscope({ frequency: 60 });

  /* 4) orientation helper: useOrientation (type & angle) */
  const { type, angle } = useOrientation(); // e.g., 'portrait-primary', 'landscape-secondary', angle 0/90/180/270
  const isLandscape = (type || "").toLowerCase().startsWith("landscape");

  // Base direction: in landscape-right many devices report "forward twist" as opposite.
  // Tweak this logic if you find direction inverted on a specific device.
  let ORIENT_DIR = 1;
  if (isLandscape) {
    // common case: angle === 90 → landscape-right
    ORIENT_DIR = angle === 90 ? -1 : 1;
  }

  /* 5) inertial pan using y-axis only */
  const velRef = useRef(0); // %/frame velocity
  const rafRef = useRef(null);

  // Tuning knobs
  const BASE_SENSE = 1; // set -1 if you prefer global inversion
  const GAIN = 3.0; // how strongly y (rad/s) nudges velocity
  const FRICTION = 0.92; // 0..1; closer to 1 = longer coast
  const DEAD_Y = 0.03; // rad/s dead-zone to ignore micro jitter
  const MAX_STEP = 1.2; // cap per-frame pos change (%)

  // rAF loop: apply velocity and friction
  useEffect(() => {
    const tick = () => {
      setPosPct((prev) => {
        const step = clamp(velRef.current, -MAX_STEP, MAX_STEP);
        const next = clamp(prev + step, 0, 100);
        return Math.abs(next - prev) < 0.02 ? prev : next;
      });

      velRef.current *= FRICTION;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Feed gyroscope y → velocity (no tilt, just wrist twist)
  useEffect(() => {
    if (!isMobile || !motionReady || gyro.error) return;

    const id = setInterval(() => {
      const y = gyro.y ?? 0; // rad/s about Y axis
      if (Math.abs(y) < DEAD_Y) return; // dead-zone
      const dir = BASE_SENSE * ORIENT_DIR; // orientation-aware sign
      velRef.current += dir * y * GAIN;
    }, 16); // ~60Hz

    return () => clearInterval(id);
  }, [isMobile, motionReady, gyro.error, gyro.y, ORIENT_DIR]);

  return (
    <div className="relative w-screen h-dvh">
      {/* Desktop hero */}
      <img
        src="./testImg.jpg"
        alt=""
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
      />

      {/* Mobile pano (backgroundPositionX driven by posPct 0..100) */}
      <div
        className="block sm:hidden w-full h-full overflow-hidden will-change-transform"
        style={{
          backgroundImage: 'url("./testImg.jpg")', // or a wider panorama image
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto 100%",
          backgroundPosition: `${posPct}% 50%`,
          transition: "none", // JS/rAF handles smoothness
        }}
      />

      {/* iOS enable motion */}
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

      {/* Optional hint if gyro missing */}
      {isMobile && motionReady && gyro.error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80">
          No gyroscope available on this device.
        </div>
      )}
    </div>
  );
}
