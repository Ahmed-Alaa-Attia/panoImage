import { useEffect, useRef, useState } from "react";
import useGyroscope from "react-hook-gyroscope";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const RotateImg = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [motionReady, setMotionReady] = useState(false); // keep your iOS gate
  const [posPct, setPosPct] = useState(50); // 0..100 background-position-x

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const gyro = useGyroscope({ frequency: 60 });

  const velRef = useRef(0);
  const rafIdRef = useRef(null);

  const GAIN = 3.0; // how strongly y (rad/s) nudges velocity
  const FRICTION = 0.92; // 0..1; higher = longer glide
  const DEAD_Y = 0.03; // rad/s; ignore tiny wrist jitter
  const MAX_STEP = 1.2; // cap per-frame position change in % to avoid spikes

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

  // rAF loop: apply velocity to pos, apply friction to velocity
  useEffect(() => {
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000; // not used directly, but left here if you want dt-based scaling
      last = now;
      console.log(dt);

      setPosPct((prev) => {
        // cap extreme per-frame jumps
        const step = clamp(velRef.current, -MAX_STEP, MAX_STEP);
        const next = clamp(prev + step, 0, 100);
        return Math.abs(next - prev) < 0.02 ? prev : next;
      });

      velRef.current *= FRICTION;
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // Feed y-axis into velocity (mobile + allowed + supported)
  useEffect(() => {
    if (!isMobile || !motionReady || gyro.error) return;

    // on every render, use current y to nudge velocity a bit
    const id = setInterval(() => {
      // rotation rate around Y axis (rad/s)
      const y = gyro.y ?? 0;

      // dead-zone: ignore tiny noise
      if (Math.abs(y) < DEAD_Y) return;

      // Optional: invert if you want the opposite direction
      const sense = 1; // set to -1 to flip direction

      // Add to velocity; GAIN sets “strength” of shove
      velRef.current += sense * y * GAIN;
    }, 16); // ~60Hz

    return () => clearInterval(id);
  }, [isMobile, motionReady, gyro.error, gyro.y]);

  return (
    <div className="relative w-screen h-dvh">
      {/* Desktop hero (unchanged) */}
      <img
        src="./testImg.jpg"
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
        alt=""
      />

      {/* Mobile pano driven by posPct (0..100) */}
      <div
        className="block sm:hidden w-full h-full overflow-hidden will-change-transform"
        style={{
          backgroundImage: 'url("./testImg.jpg")', // or panorama.jpg if wider
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto 100%",
          backgroundPosition: `${posPct}% 50%`,
          transition: "none", // JS handles smoothing; keep off to avoid fighting
        }}
      />

      {/* iOS: enable motion (once) */}
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

      {/* Optional: show error if no gyro */}
      {isMobile && motionReady && gyro.error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80">
          No gyroscope available.
        </div>
      )}
    </div>
  );
};

export default RotateImg;
