"use client";

// Phase 13.2 QA cheat console (/debug).
//
// Force the habitat into any level / lion mood / quality WITHOUT grinding
// flashcards, to test the web + mobile app. The override is a signed cookie
// applied in computeHabitatState (server-side) → it flows through /habitat (the
// per-level×mood video clip), the dashboard widget, badges and the decay tint.
// No real data is mutated, so the live "real state" readout below lets QA also
// confirm that learning cards genuinely advances levels.
//
// Gated by DEBUG_CHEAT_SECRET: enter the secret once (remembered in
// localStorage). When the secret env var is unset, the endpoints 404 and this
// page shows a disabled notice.

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HabitatState, TigerMood } from "@/lib/habitat-engine";

const SECRET_KEY = "leo-debug-secret";
const MOODS: TigerMood[] = ["excited", "happy", "neutral", "sad"];
const QUALITY_PRESETS = [
  { label: "1.0 — pristine", value: 1 },
  { label: "0.7 — happy floor", value: 0.7 },
  { label: "0.4 — neutral floor", value: 0.4 },
  { label: "0.2 — neglected", value: 0.2 },
];

const REAL = "real";

interface DebugStateResponse {
  real: HabitatState;
  forced: { level?: number; mood?: TigerMood; quality?: number } | null;
}

const selectClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

export default function DebugPage() {
  const [secret, setSecret] = useState("");
  const [level, setLevel] = useState<string>(REAL);
  const [mood, setMood] = useState<string>(REAL);
  const [quality, setQuality] = useState<string>(REAL);
  const [data, setData] = useState<DebugStateResponse | null>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (s: string) => {
    if (!s) {
      setStatus("Enter the debug secret first.");
      return;
    }
    setBusy(true);
    setStatus("Loading state…");
    try {
      const res = await fetch(
        `/api/debug/state?secret=${encodeURIComponent(s)}`,
      );
      if (res.status === 404) {
        setStatus(
          "Debug feature is disabled (DEBUG_CHEAT_SECRET not set on this deployment).",
        );
        setData(null);
        return;
      }
      if (res.status === 403) {
        setStatus("Wrong secret.");
        setData(null);
        return;
      }
      if (!res.ok) {
        setStatus(`Error ${res.status}.`);
        return;
      }
      const json: DebugStateResponse = await res.json();
      setData(json);
      localStorage.setItem(SECRET_KEY, s);
      // Seed the controls from whatever is currently forced.
      setLevel(json.forced?.level != null ? String(json.forced.level) : REAL);
      setMood(json.forced?.mood ?? REAL);
      setQuality(
        json.forced?.quality != null ? String(json.forced.quality) : REAL,
      );
      setStatus("Loaded.");
    } catch {
      setStatus("Network error.");
    } finally {
      setBusy(false);
    }
  }, []);

  // On mount: load the remembered secret and auto-fetch its state. Runs once
  // (refresh is a stable useCallback); later loads are user-driven.
  useEffect(() => {
    const saved = localStorage.getItem(SECRET_KEY);
    if (saved) {
      setSecret(saved);
      void refresh(saved);
    }
  }, [refresh]);

  async function apply() {
    setBusy(true);
    setStatus("Applying…");
    const body: Record<string, unknown> = { secret };
    if (level !== REAL) body.level = Number(level);
    if (mood !== REAL) body.mood = mood;
    if (quality !== REAL) body.quality = Number(quality);
    if (
      body.level === undefined &&
      body.mood === undefined &&
      body.quality === undefined
    ) {
      setStatus("Nothing to force — set at least one field (or use Reset).");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch("/api/debug/cheat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setStatus(`Apply failed (${res.status}).`);
        return;
      }
      setStatus("Forced. Open /habitat or /dashboard to view.");
      await refresh(secret);
    } catch {
      setStatus("Network error.");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setStatus("Clearing…");
    try {
      const res = await fetch("/api/debug/cheat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, clear: true }),
      });
      if (!res.ok) {
        setStatus(`Reset failed (${res.status}).`);
        return;
      }
      setLevel(REAL);
      setMood(REAL);
      setQuality(REAL);
      setStatus("Override cleared — back to real state.");
      await refresh(secret);
    } catch {
      setStatus("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl p-4 sm:p-6 flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">🐯 Habitat debug console</h1>
        <p className="text-sm text-muted-foreground">
          Force habitat level / lion state for QA — no flashcards, no real data
          changed. Flows through /habitat, the dashboard widget, and the video
          clip. Reset reverts to your real state.
        </p>
      </div>

      <Card className="p-4 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="secret">Debug secret</Label>
          <div className="flex gap-2">
            <Input
              id="secret"
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="DEBUG_CHEAT_SECRET"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => refresh(secret)}
            >
              Load
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="level">Level</Label>
            {/* biome-ignore lint/a11y/useSemanticElements: native select is intentional */}
            <select
              id="level"
              className={selectClass}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value={REAL}>Real (no override)</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={String(n)}>
                  Level {n}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mood">Mood</Label>
            <select
              id="mood"
              className={selectClass}
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value={REAL}>Real (no override)</option>
              {MOODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quality">Quality</Label>
            <select
              id="quality"
              className={selectClass}
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              <option value={REAL}>Real (no override)</option>
              {QUALITY_PRESETS.map((q) => (
                <option key={q.value} value={String(q.value)}>
                  {q.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" disabled={busy} onClick={apply}>
            Apply override
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={reset}
          >
            Reset to real
          </Button>
          <a
            href="/habitat"
            className="ml-auto inline-flex items-center text-sm underline underline-offset-4"
          >
            Open /habitat →
          </a>
        </div>

        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </Card>

      {data && (
        <Card className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live REAL state</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => refresh(secret)}
            >
              Refresh
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Computed from your actual data (ignores any override). Learn cards
            and Refresh to watch real progression.
          </p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <Stat k="Level" v={data.real.level} />
            <Stat k="Mood" v={data.real.mood} />
            <Stat k="Quality" v={data.real.quality.toFixed(3)} />
            <Stat k="Learned cards" v={data.real.learnedCardCount} />
            <Stat k="Effective cards" v={data.real.effectiveCardCount} />
            <Stat
              k="Next-level threshold"
              v={data.real.nextLevelThreshold ?? "max"}
            />
            <Stat k="Decaying?" v={String(data.real.isDecaying)} />
            <Stat
              k="Mins since study"
              v={data.real.minutesSinceActivity ?? "never"}
            />
          </dl>
          <div className="mt-2 rounded-md bg-muted/50 p-2 text-sm">
            <span className="font-medium">Currently forced: </span>
            {data.forced
              ? JSON.stringify(data.forced)
              : "none (showing real state)"}
          </div>
        </Card>
      )}
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium tabular-nums">{v}</dd>
    </>
  );
}
