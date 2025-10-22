import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (!isMobile || !motionReady) return;
    const onOrient = (e) => {
      const gamma = e.gamma || 0;
      setPosPct(gammaToPos(gamma));
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
          backgroundImage: 'url("./testImg.jpg")',
          backgroundRepeat: "no-repeat",
          backgroundSize: "auto 100%",
          backgroundPosition: `${posPct}% 50%`,
          transition: "background-position 700ms ease-in-out 0",
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
