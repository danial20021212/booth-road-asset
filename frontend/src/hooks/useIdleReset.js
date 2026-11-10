import { useEffect, useRef } from "react";

// Calls onIdle() after `ms` with no pointer or keyboard activity. Only runs while `enabled`.
export function useIdleReset(enabled, ms, onIdle) {
  const callback = useRef(onIdle);

  useEffect(() => {
    callback.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;
    let timer;
    const arm = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current(), ms);
    };
    const events = ["pointerdown", "pointermove", "keydown"];
    events.forEach((e) => window.addEventListener(e, arm));
    arm();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, arm));
    };
  }, [enabled, ms]);
}
