import React, { useState, useEffect, useRef } from "react";
import { storage } from "./storage.js";

/* ---------- tables ---------- */
const ODDS = [
  { k: "certain", label: "Near certain", mod: 2 },
  { k: "likely", label: "Likely", mod: 1 },
  { k: "even", label: "50/50", mod: 0 },
  { k: "unlikely", label: "Unlikely", mod: -1 },
  { k: "remote", label: "Near impossible", mod: -2 },
];
// bare yes / bare no are deliberately absent — every answer carries an obligation
const LADDER = [
  { r: "No, and", ob: "name the escalation" },
  { r: "No, but", ob: "name the consolation" },
  { r: "Yes, but", ob: "name the cost" },
  { r: "Yes, and", ob: "name the bonus" },
];
const PACING = [
  "Foreshadow trouble",
  "Reveal a new detail",
  "An NPC takes action",
  "Advance a threat",
  "Something is taken away",
  "A deadline moves closer",
];
const FAILURE = [
  "You succeed, but at a cost",
  "You are put in a worse position",
  "A resource is spent or broken",
  "An enemy gains ground",
  "A new threat appears",
  "The truth was different than assumed",
];
const COMPLICATIONS = [
  "Hostile forces oppose you",
  "An obstacle blocks the way",
  "Wouldn't it suck if…",
  "An NPC acts suddenly",
  "All is not as it seems",
  "Things actually go as planned",
];
const RESOLVE = [
  { k: "won", label: "Won", note: "scene want achieved", t: -1 },
  { k: "denied", label: "Denied", note: "want definitively blocked", t: +1 },
  { k: "pivot", label: "Pivot", note: "new info makes want irrelevant", t: 0 },
  { k: "cost", label: "Cost", note: "got it, paid something", t: +1 },
];

const BLANK = {
  phase: "open",
  threads: [],
  cast: [],
  clocks: [],
  pc: "",
  worldStatus: "",
  tension: 4,
  seed: { intent: "", questions: ["", "", ""], hook: "" },
  sessionNo: 0,
  session: null,
  archive: [],
};
const KEY = "solo-runner:campaign";
const d = (n) => Math.floor(Math.random() * n) + 1;

/* ---------- primitives ---------- */
const Panel = ({ title, tag, children }) => (
  <div className="border border-stone-800 bg-stone-900/60">
    <div className="flex items-baseline justify-between border-b border-stone-800 px-3 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">{title}</span>
      {tag && <span className="font-mono text-[10px] text-amber-500/80">{tag}</span>}
    </div>
    <div className="p-3">{children}</div>
  </div>
);
const Field = ({ label, value, onChange, ph, rows }) => (
  <label className="block">
    <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">{label}</span>
    {rows ? (
      <textarea
        rows={rows}
        value={value}
        placeholder={ph}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none border border-stone-800 bg-stone-950 px-2 py-1.5 text-sm text-stone-200 placeholder-stone-600 focus:border-teal-600 focus:outline-none"
      />
    ) : (
      <input
        value={value}
        placeholder={ph}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-stone-800 bg-stone-950 px-2 py-1.5 text-sm text-stone-200 placeholder-stone-600 focus:border-teal-600 focus:outline-none"
      />
    )}
  </label>
);
const Btn = ({ children, onClick, tone = "ghost", disabled, small }) => {
  const tones = {
    ghost: "border-stone-700 text-stone-300 hover:border-stone-500",
    go: "border-teal-700 bg-teal-900/40 text-teal-200 hover:border-teal-500",
    warn: "border-amber-700 bg-amber-900/30 text-amber-200 hover:border-amber-500",
    cut: "border-rose-800 bg-rose-950/40 text-rose-200 hover:border-rose-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`border font-mono uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        small ? "px-2 py-1 text-[10px]" : "px-3 py-2 text-[11px]"
      } ${tones[tone]}`}
    >
      {children}
    </button>
  );
};

/* ---------- app ---------- */
export default function SoloSessionRunner() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  const [oracle, setOracle] = useState(null);
  const [odds, setOdds] = useState("even");
  const [move, setMove] = useState(null);
  const [unlogged, setUnlogged] = useState(0);
  const [idle, setIdle] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get(KEY);
        setS(r ? JSON.parse(r.value) : BLANK);
      } catch {
        setS(BLANK);
      }
    })();
  }, []);

  const put = (next) => {
    setS(next);
    storage.set(KEY, JSON.stringify(next)).catch(() => setErr("Save failed — state is live but not stored."));
  };
  const patch = (o) => put({ ...s, ...o });
  const patchSession = (o) => put({ ...s, session: { ...s.session, ...o } });

  // lull detector
  useEffect(() => {
    if (s?.phase !== "run") return;
    setIdle(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setIdle(true), 300000);
    return () => clearTimeout(timer.current);
  }, [s?.phase, s?.session?.scenes?.length, oracle, move]);

  if (!s) return <div className="min-h-screen bg-stone-950 p-6 font-mono text-xs text-stone-500">Loading campaign…</div>;

  const sess = s.session;
  const scene = sess?.scene;
  const sceneCount = sess?.scenes?.length ?? 0;

  /* ----- actions ----- */
  const startSession = () => {
    if (!sess.intent.trim()) return setErr("Declare an intent before playing. One falsifiable sentence.");
    setErr("");
    patch({
      phase: "run",
      session: {
        ...sess,
        scene: { where: "", who: "", want: "", whyNow: "", complication: COMPLICATIONS[d(6) - 1], log: "" },
        scenes: [],
        oracleCalls: [],
      },
    });
  };

  const rollOracle = () => {
    const mod = ODDS.find((o) => o.k === odds).mod;
    const roll = Math.max(0, Math.min(3, Math.floor((d(6) + d(6)) / 4) + mod));
    setOracle({ ...LADDER[roll], odds });
    setUnlogged((n) => n + 1);
  };

  const resolveScene = (r) => {
    if (!scene.log.trim()) return setErr("Log one line before resolving. Deferred logging is no logging.");
    setErr("");
    const n = sceneCount + 1;
    const clocks =
      n % 2 === 0
        ? s.clocks.map((c, i) => (i === 0 ? { ...c, filled: Math.min(c.segments, c.filled + 1) } : c))
        : s.clocks;
    put({
      ...s,
      clocks,
      tension: Math.max(1, Math.min(9, s.tension + RESOLVE.find((x) => x.k === r).t)),
      session: {
        ...sess,
        scenes: [...sess.scenes, { ...scene, resolve: r, n }],
        scene: { where: "", who: "", want: "", whyNow: "", complication: COMPLICATIONS[d(6) - 1], log: "" },
      },
    });
    setOracle(null);
    setMove(null);
    setUnlogged(0);
  };

  const land = () => {
    if (sceneCount < 1) return setErr("Play at least one scene before landing.");
    setErr("");
    patch({ phase: "land", session: { ...sess, verdict: "", bullets: "", deltaPc: s.pc, deltaWorld: s.worldStatus } });
  };

  const closeSession = () => {
    const q = sess.seedQ || ["", "", ""];
    if (!sess.seedIntent?.trim() || q.filter((x) => x.trim()).length < 2 || !sess.seedHook?.trim())
      return setErr("Seed required: next intent, two cold questions, one hook. This is what lets you start warm.");
    if (!sess.verdict) return setErr("Answer the session intent: yes / no / complicated.");
    setErr("");
    put({
      ...s,
      phase: "open",
      pc: sess.deltaPc,
      worldStatus: sess.deltaWorld,
      seed: { intent: sess.seedIntent, questions: q, hook: sess.seedHook },
      archive: [...s.archive, { n: s.sessionNo, intent: sess.intent, verdict: sess.verdict, bullets: sess.bullets }],
      session: null,
    });
  };

  const openSession = () =>
    patch({
      sessionNo: s.sessionNo + 1,
      session: {
        intent: s.seed.intent || "",
        coldAnswers: ["", "", ""],
        scenes: [],
      },
    });

  /* ----- thread / cast / clock editors ----- */
  const addThread = () => {
    if (s.threads.length >= 6) return setErr("Thread cap is 6. Close or merge one first — over 6 you get paralysis.");
    setErr("");
    patch({ threads: [...s.threads, { text: "", open: true }] });
  };
  const addClock = () => s.clocks.length < 4 && patch({ clocks: [...s.clocks, { label: "", filled: 0, segments: 6 }] });

  /* ----- views ----- */
  const Header = () => (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-stone-800 pb-3">
      <div>
        <h1 className="font-mono text-sm uppercase tracking-[0.3em] text-stone-300">Session Runner</h1>
        <p className="font-mono text-[10px] tracking-[0.14em] text-stone-600">
          OPEN · RUN · LAND — session {s.sessionNo || "—"}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">Tension</div>
          <div className="flex gap-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <button
                key={i}
                onClick={() => patch({ tension: i + 1 })}
                className={`h-4 w-2 ${i < s.tension ? "bg-amber-500" : "bg-stone-800"}`}
                aria-label={`Set tension ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <div className="font-mono text-2xl text-amber-500">{s.tension}</div>
      </div>
    </div>
  );

  const Clocks = () => (
    <Panel title="Clocks" tag={`${s.clocks.length}/4`}>
      <div className="space-y-2">
        {s.clocks.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={c.label}
              placeholder="offscreen pressure"
              onChange={(e) => {
                const cl = [...s.clocks];
                cl[i] = { ...c, label: e.target.value };
                patch({ clocks: cl });
              }}
              className="min-w-0 flex-1 border-b border-stone-800 bg-transparent text-xs text-stone-300 placeholder-stone-600 focus:outline-none"
            />
            <div className="flex gap-0.5">
              {Array.from({ length: c.segments }).map((_, j) => (
                <button
                  key={j}
                  onClick={() => {
                    const cl = [...s.clocks];
                    cl[i] = { ...c, filled: j + 1 === c.filled ? j : j + 1 };
                    patch({ clocks: cl });
                  }}
                  className={`h-3 w-3 border ${j < c.filled ? "border-rose-600 bg-rose-700" : "border-stone-700"}`}
                />
              ))}
            </div>
          </div>
        ))}
        {s.clocks.length < 4 && (
          <Btn small onClick={addClock}>
            + clock
          </Btn>
        )}
      </div>
    </Panel>
  );

  const Threads = () => (
    <Panel title="Threads" tag={`${s.threads.filter((t) => t.open).length}/6 open`}>
      <div className="space-y-1.5">
        {s.threads.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => {
                const th = [...s.threads];
                th[i] = { ...t, open: !t.open };
                patch({ threads: th });
              }}
              className={`h-3 w-3 shrink-0 border ${t.open ? "border-teal-600" : "border-stone-700 bg-stone-700"}`}
            />
            <input
              value={t.text}
              placeholder="unresolved question"
              onChange={(e) => {
                const th = [...s.threads];
                th[i] = { ...t, text: e.target.value };
                patch({ threads: th });
              }}
              className={`min-w-0 flex-1 border-b border-stone-800 bg-transparent text-xs placeholder-stone-600 focus:outline-none ${
                t.open ? "text-stone-300" : "text-stone-600 line-through"
              }`}
            />
          </div>
        ))}
        <Btn small onClick={addThread}>
          + thread
        </Btn>
      </div>
    </Panel>
  );

  const Cast = () => (
    <Panel title="Cast" tag={`${s.cast.length}/10`}>
      <div className="space-y-1.5">
        {s.cast.map((c, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={c.name}
              placeholder="name"
              onChange={(e) => {
                const a = [...s.cast];
                a[i] = { ...c, name: e.target.value };
                patch({ cast: a });
              }}
              className="w-1/3 border-b border-stone-800 bg-transparent text-xs text-stone-300 placeholder-stone-600 focus:outline-none"
            />
            <input
              value={c.want}
              placeholder="what they want / disposition"
              onChange={(e) => {
                const a = [...s.cast];
                a[i] = { ...c, want: e.target.value };
                patch({ cast: a });
              }}
              className="min-w-0 flex-1 border-b border-stone-800 bg-transparent text-xs text-stone-400 placeholder-stone-600 focus:outline-none"
            />
          </div>
        ))}
        {s.cast.length < 10 && (
          <Btn small onClick={() => patch({ cast: [...s.cast, { name: "", want: "" }] })}>
            + cast
          </Btn>
        )}
      </div>
    </Panel>
  );

  return (
    <div className="min-h-screen bg-stone-950 px-4 py-6 text-stone-300">
      <div className="mx-auto max-w-3xl">
        <Header />
        {err && (
          <div className="mb-3 border border-rose-900 bg-rose-950/50 px-3 py-2 font-mono text-[11px] text-rose-300">
            {err}
          </div>
        )}

        {/* ============ OPEN ============ */}
        {s.phase === "open" && (
          <div className="space-y-3">
            <Panel title="O1 · Recap" tag="3 min max">
              {s.archive.length === 0 && !s.seed.intent ? (
                <p className="text-xs text-stone-500">
                  No campaign yet. Add a thread, a clock, and a PC line below, then open session 1.
                </p>
              ) : (
                <div className="space-y-2 text-xs">
                  {s.archive.slice(-1).map((a, i) => (
                    <div key={i} className="text-stone-400">
                      <span className="font-mono text-[10px] uppercase text-stone-600">last verdict </span>
                      <span className="text-teal-400">{a.verdict}</span> — {a.bullets}
                    </div>
                  ))}
                  {s.seed.hook && (
                    <div className="border-l-2 border-amber-600 pl-2 italic text-amber-200/90">{s.seed.hook}</div>
                  )}
                </div>
              )}
            </Panel>

            <div className="grid gap-3 md:grid-cols-2">
              <Panel title="O2 · State check">
                <Field label="PC status" rows={3} value={s.pc} onChange={(v) => patch({ pc: v })} ph="wounds, supplies, position" />
                <div className="h-2" />
                <Field
                  label="World status"
                  rows={3}
                  value={s.worldStatus}
                  onChange={(v) => patch({ worldStatus: v })}
                  ph="what changed without you"
                />
              </Panel>
              <div className="space-y-3">
                <Clocks />
                <Threads />
              </div>
            </div>

            {!sess ? (
              <Btn tone="go" onClick={openSession}>
                Open session {s.sessionNo + 1}
              </Btn>
            ) : (
              <>
                <Panel title="O3 · Tick the world" tag="answer cold, with the oracle">
                  {s.seed.questions.map(
                    (q, i) =>
                      q && (
                        <div key={i} className="mb-2">
                          <div className="mb-1 text-xs text-stone-400">{q}</div>
                          <input
                            value={sess.coldAnswers[i]}
                            placeholder="yes,and / yes,but / no,but / no,and →"
                            onChange={(e) => {
                              const a = [...sess.coldAnswers];
                              a[i] = e.target.value;
                              patchSession({ coldAnswers: a });
                            }}
                            className="w-full border border-stone-800 bg-stone-950 px-2 py-1 text-xs text-stone-200 placeholder-stone-600 focus:border-teal-600 focus:outline-none"
                          />
                        </div>
                      )
                  )}
                  {!s.seed.questions.some((q) => q) && (
                    <p className="text-xs text-stone-500">No cold questions stored. Skip to intent.</p>
                  )}
                </Panel>

                <Panel title="O4 · Declare intent" tag="required · falsifiable">
                  <p className="mb-2 font-mono text-[10px] text-stone-600">
                    This session, [PC] will try to [concrete action] so that [thread advances].
                  </p>
                  <Field
                    label="Intent"
                    rows={2}
                    value={sess.intent}
                    onChange={(v) => patchSession({ intent: v })}
                    ph="Kess will try to bribe the night registrar so she learns which ship carried the relic."
                  />
                </Panel>
                <Btn tone="go" onClick={startSession}>
                  Frame scene 1 →
                </Btn>
              </>
            )}
          </div>
        )}

        {/* ============ RUN ============ */}
        {s.phase === "run" && (
          <div className="space-y-3">
            <div className="border border-teal-900 bg-teal-950/30 px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-teal-600">Intent</span>
              <p className="text-sm text-teal-100">{sess.intent}</p>
            </div>

            {sceneCount >= 5 && (
              <div className="border border-rose-800 bg-rose-950/40 px-3 py-2 font-mono text-[11px] text-rose-200">
                Five scenes. Land it now — beyond this you will not log properly and momentum dies.
              </div>
            )}
            {sceneCount === 3 && (
              <div className="border border-amber-800 bg-amber-950/30 px-3 py-2 font-mono text-[11px] text-amber-200">
                Three scenes. A clean landing is available. Look for a cut point.
              </div>
            )}
            {unlogged >= 3 && (
              <div className="border border-amber-800 bg-amber-950/30 px-3 py-2 font-mono text-[11px] text-amber-200">
                Three oracle calls, nothing narrated. Stop asking and state what happens.
              </div>
            )}
            {idle && (
              <div className="border border-amber-800 bg-amber-950/30 px-3 py-2 font-mono text-[11px] text-amber-200">
                Lull detected. Fire a pacing move.
              </div>
            )}

            <Panel title={`Scene ${sceneCount + 1} · Frame`} tag={scene.complication}>
              <div className="grid gap-2 md:grid-cols-2">
                <Field label="Where" value={scene.where} onChange={(v) => patchSession({ scene: { ...scene, where: v } })} ph="one sensory detail" />
                <Field label="Who" value={scene.who} onChange={(v) => patchSession({ scene: { ...scene, who: v } })} ph="pull from cast first" />
                <Field label="Want" value={scene.want} onChange={(v) => patchSession({ scene: { ...scene, want: v } })} ph="smaller than the intent" />
                <Field label="Why now" value={scene.whyNow} onChange={(v) => patchSession({ scene: { ...scene, whyNow: v } })} ph="deadline, threat, departure" />
              </div>
              {!scene.whyNow && (
                <p className="mt-2 font-mono text-[10px] text-amber-600/80">
                  Why now is empty — the scene will sag. Reroll the complication or skip the scene.
                </p>
              )}
              <div className="mt-2">
                <Btn small onClick={() => patchSession({ scene: { ...scene, complication: COMPLICATIONS[d(6) - 1] } })}>
                  reroll complication
                </Btn>
              </div>
            </Panel>

            <div className="grid gap-3 md:grid-cols-3">
              <Panel title="Oracle">
                <select
                  value={odds}
                  onChange={(e) => setOdds(e.target.value)}
                  className="mb-2 w-full border border-stone-800 bg-stone-950 px-2 py-1 text-xs text-stone-300 focus:outline-none"
                >
                  {ODDS.map((o) => (
                    <option key={o.k} value={o.k}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Btn onClick={rollOracle}>Ask</Btn>
                {oracle && (
                  <div className="mt-2 border-l-2 border-teal-600 pl-2">
                    <div className="text-sm text-teal-200">{oracle.r}</div>
                    <div className="font-mono text-[10px] text-stone-500">→ {oracle.ob}</div>
                  </div>
                )}
              </Panel>
              <Panel title="Pacing move" tag="on a lull">
                <Btn tone="warn" onClick={() => { setMove({ t: "Pacing", v: PACING[d(6) - 1] }); setUnlogged(0); }}>
                  Fire
                </Btn>
                {move?.t === "Pacing" && <p className="mt-2 text-sm text-amber-200">{move.v}</p>}
              </Panel>
              <Panel title="Failure move" tag="on a failed check">
                <Btn tone="warn" onClick={() => { setMove({ t: "Failure", v: FAILURE[d(6) - 1] }); setUnlogged(0); }}>
                  Fire
                </Btn>
                {move?.t === "Failure" && <p className="mt-2 text-sm text-amber-200">{move.v}</p>}
              </Panel>
            </div>

            <Panel title="Log · one line, now" tag="required to resolve">
              <Field
                label="What happened → what changed"
                value={scene.log}
                onChange={(v) => { patchSession({ scene: { ...scene, log: v } }); setUnlogged(0); }}
                ph="bribed registrar, got ship name → he now holds leverage"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {RESOLVE.map((r) => (
                  <Btn key={r.k} onClick={() => resolveScene(r.k)}>
                    {r.label}
                    <span className="ml-1 text-stone-600">{r.t > 0 ? "+1" : r.t < 0 ? "−1" : "0"}</span>
                  </Btn>
                ))}
              </div>
              <p className="mt-2 font-mono text-[10px] text-stone-600">
                {RESOLVE.map((r) => `${r.label}: ${r.note}`).join(" · ")}
              </p>
            </Panel>

            {sess.scenes.length > 0 && (
              <Panel title="This session">
                <ul className="space-y-1 text-xs text-stone-400">
                  {sess.scenes.map((sc, i) => (
                    <li key={i}>
                      <span className="font-mono text-stone-600">S{sc.n} </span>
                      {sc.log} <span className="text-stone-600">[{sc.resolve}]</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Btn tone="cut" onClick={land}>
              Land the session →
            </Btn>
          </div>
        )}

        {/* ============ LAND ============ */}
        {s.phase === "land" && (
          <div className="space-y-3">
            <Panel title="L1 · Cut point">
              <p className="text-xs text-stone-500">
                End on a decision, a door, or a revelation. Never at rest, never mid-fight.
              </p>
            </Panel>

            <Panel title="L2 · Answer the intent">
              <p className="mb-2 text-sm text-teal-200">{sess.intent}</p>
              <div className="flex gap-2">
                {["Yes", "No", "Complicated"].map((v) => (
                  <button
                    key={v}
                    onClick={() => patchSession({ verdict: v })}
                    className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
                      sess.verdict === v ? "border-teal-500 bg-teal-900/50 text-teal-100" : "border-stone-700 text-stone-400"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel title="L3 · Log" tag="max 5 bullets">
              <Field label="Bullets" rows={4} value={sess.bullets} onChange={(v) => patchSession({ bullets: v })} ph="one line each, only what future-you needs" />
            </Panel>

            <div className="grid gap-3 md:grid-cols-2">
              <Panel title="L4 · Deltas">
                <Field label="PC status" rows={3} value={sess.deltaPc} onChange={(v) => patchSession({ deltaPc: v })} />
                <div className="h-2" />
                <Field label="World status" rows={3} value={sess.deltaWorld} onChange={(v) => patchSession({ deltaWorld: v })} />
              </Panel>
              <div className="space-y-3">
                <Threads />
                <Cast />
                <Clocks />
              </div>
            </div>

            <Panel title="L6 · Seed" tag="required · this is what lets you start warm">
              <Field
                label="Next intent"
                rows={2}
                value={sess.seedIntent || ""}
                onChange={(v) => patchSession({ seedIntent: v })}
                ph="[PC] will try to [action] so that [thread advances]"
              />
              <div className="mt-2 grid gap-2">
                {[0, 1, 2].map((i) => (
                  <Field
                    key={i}
                    label={`Cold question ${i + 1}${i < 2 ? "" : " (optional)"}`}
                    value={(sess.seedQ || ["", "", ""])[i]}
                    onChange={(v) => {
                      const q = [...(sess.seedQ || ["", "", ""])];
                      q[i] = v;
                      patchSession({ seedQ: q });
                    }}
                    ph="about the world, people, factions — not about your choices"
                  />
                ))}
              </div>
              <div className="mt-2">
                <Field label="Hook" value={sess.seedHook || ""} onChange={(v) => patchSession({ seedHook: v })} ph="an image, a line, a threat" />
              </div>
            </Panel>

            <div className="flex gap-2">
              <Btn onClick={() => patch({ phase: "run" })}>← back to play</Btn>
              <Btn tone="go" onClick={closeSession}>
                Close session
              </Btn>
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-stone-800 pt-3">
          <Btn
            small
            onClick={() => {
              if (window.confirm("Erase this campaign and all archived sessions?")) put(BLANK);
            }}
          >
            reset campaign
          </Btn>
        </div>
      </div>
    </div>
  );
}
