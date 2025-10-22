// MobileScrollPan.jsx
// Plain React, no TypeScript

export default function MobileScrollPan() {
  return (
    <div className="relative w-screen h-dvh">
      {/* DESKTOP: fill the viewport, no pan */}
      <img
        src="./testImg.jpg"
        alt=""
        className="hidden sm:block w-full h-full object-cover"
        draggable={false}
      />

      {/* MOBILE: simple, native horizontal scroll to pan */}
      <div
        className="
          block sm:hidden
          w-full h-full
          overflow-x-auto overflow-y-hidden
          touch-pan-x                 /* hint: horizontal touch gestures */
          snap-x snap-mandatory       /* optional: snap stops */
          [scrollbar-width:none]      /* Firefox hide scrollbar */
        "
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="relative h-full w-[200vw] snap-x">
          <img
            src="./panorama.jpg"
            alt=""
            draggable={false}
            className="
              h-full w-auto object-contain
              select-none
              pointer-events-none  /* avoids accidental image drag ghosting */
              snap-center          /* optional: snap image center into view */
              mx-auto              /* keeps it centered when not scrolled */
              block
            "
          />
        </div>
      </div>
    </div>
  );
}
