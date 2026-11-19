"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { heartbeat } from "@/actions/work";

const BEAT_MS = 30_000; // matches the server's 20–45 second counting window
const IDLE_MS = 3 * 60_000; // no input for 3 minutes pauses the clock

export type ClockPause =
  | "idle"
  | "hidden"
  | "needs_presence"
  | "daily_cap"
  | "lost_claim"
  | "error"
  | null;

/**
 * Sends "I am here and active" heartbeats. The server decides how much time each
 * beat is worth; the browser never sends a number of seconds. Between beats the
 * display ticks forward locally while running, and is replaced by the server's
 * figure on every beat.
 */
export function useWorkClock(itemId: string, enabled = true) {
  const [itemSeconds, setItemSeconds] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [paused, setPaused] = useState<ClockPause>(null);
  const [synced, setSynced] = useState(false);
  const lastInput = useRef(0);
  const beatRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    // Preview mode: no heartbeats, so no time is ever counted.
    if (!enabled) return;
    lastInput.current = Date.now();
    const mark = () => {
      lastInput.current = Date.now();
    };
    const events = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }));

    let cancelled = false;
    const beat = async () => {
      const visible = document.visibilityState === "visible";
      const active = visible && Date.now() - lastInput.current < IDLE_MS;
      const res = await heartbeat(itemId, active);
      if (cancelled) return;
      if ("error" in res) {
        setPaused(res.error?.includes("no longer assigned") ? "lost_claim" : "error");
        return;
      }
      setItemSeconds(res.itemSeconds);
      setSessionSeconds(res.sessionSeconds);
      setSynced(true);
      setPaused((res.stopReason as ClockPause) ?? (active ? null : visible ? "idle" : "hidden"));
    };
    beatRef.current = beat;

    void beat();
    const id = setInterval(beat, BEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
      events.forEach((e) => window.removeEventListener(e, mark));
    };
  }, [itemId, enabled]);

  // Local display tick between beats (never sent to the server).
  useEffect(() => {
    if (paused || !synced) return;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastInput.current >= IDLE_MS) return;
      setItemSeconds((s) => s + 1);
      setSessionSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused, synced]);

  /** Re-sync immediately, e.g. after the contributor confirms presence. */
  const resync = useCallback(() => {
    lastInput.current = Date.now();
    void beatRef.current();
  }, []);

  return { itemSeconds, sessionSeconds, paused, resync };
}

export { formatClock, formatHoursMinutes } from "@/lib/format-time";
