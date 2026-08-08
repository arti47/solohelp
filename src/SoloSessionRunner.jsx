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
const UIKEY = "solo-runner:ui";
const BLANK_UI = { closed: {}, orientation: false };
const d = (n) => Math.floor(Math.random() * n) + 1;

/* ---------- help copy ----------
   Plain instructional voice: what to do here, and what blocks you.
   Keys match Panel `helpId` (falling back to `title`). */
const HELP = {
  "O1 · Recap": "Read last session's verdict and hook to get back into the fiction. Nothing to fill in. If this is your first session it will be empty — that is fine, keep going down the page.",
  "O2 · State check": "PC status is where your character stands right now: wounds, supplies, position. World status is what moved while you were away. Both carry over between sessions and are what let you start warm instead of re-deriving everything. Write them once now; you will get a chance to update them when you land the session.",
  "O3 · Tick the world": "Answer the questions you left yourself last session, before you have a plan. Roll the oracle for each one and write the answer as yes,and / yes,but / no,but / no,and — never a bare yes or no. Answering cold stops you steering the world toward what you already want.",
  "O4 · Declare intent": "One sentence saying what you are trying to achieve this session, phrased so it can fail. Follow the template above the box. You cannot start playing without it — a session with no falsifiable goal has no ending.",
  Clocks: "Progress bars for pressure happening offscreen: a pursuit closing in, a ritual completing. Name it, then click segments to fill or unfill. The first clock ticks automatically every second scene. Optional; up to 4.",
  Threads: "Your open questions — the things the campaign is actually about. Click the square to close a thread when it is answered. Capped at 6 open, because past six you stop choosing and start dithering.",
  Cast: "People who exist and what they want. Pull from this list when a scene needs a face, rather than inventing someone new each time. Optional; up to 10.",
  scene: "Set the frame before you play: where you are (one sensory detail), who is present, what you want in this scene (smaller than the session intent), and why it has to happen now. The complication is rolled for you — reroll it if it does not fit. Fill 'why now' or the scene will drift.",
  Oracle: "Ask the world a closed question. Pick how likely a yes is, press Ask, and read the answer. Every answer carries an obligation — name the cost, bonus, escalation or consolation before you move on. Bare yes/no is deliberately not on the table.",
  "Pacing move": "Press Fire when the scene stalls and you do not know what happens next. It hands you something that moves the fiction. Use it instead of asking the oracle another question.",
  "Failure move": "Press Fire when your own system says you failed a roll. It tells you how the failure bites, so failure costs something instead of stopping play.",
  "Log · one line, now": "Write what happened and what changed, in one line, before you resolve. Then pick the outcome: Won, Denied, Pivot or Cost. The outcome adjusts the tension track at the top automatically. You cannot resolve without the log line.",
  "This session": "Scenes you have already resolved, in order. Read-only.",
  "L1 · Cut point": "Guidance only, nothing to fill in. Stop on a decision, a door, or a revelation — never with everything calm and never mid-fight.",
  "L2 · Answer the intent": "Say plainly whether you achieved the intent you declared at the start: Yes, No, or Complicated. Required to close.",
  "L3 · Log": "Up to five bullets, one line each. Write only what you will need next time — not a transcript.",
  "L4 · Deltas": "Update PC status and World status to where they stand now. These are pre-filled with what you wrote at OPEN; edit them. What you leave here is what greets you next session.",
  "L6 · Seed": "The most important step. Write next session's intent, at least two cold questions about the world (not about your choices), and one hook — an image, a line, a threat. Required to close, because starting cold is the main reason solo campaigns get abandoned.",
};

const ORIENTATION = [
  "This app runs the session; it does not run the rules. Bring whatever RPG system you already use for rolls and combat — the app never touches them.",
  "Every session is three phases. OPEN: check where things stand and declare one goal that can fail. RUN: play 3–5 scenes, asking the oracle when you do not know an answer, logging one line per scene. LAND: answer whether you hit the goal, then leave yourself a seed for next time.",
  "The bar at the top right is tension, 1–9. It moves on its own as you resolve scenes; use it to judge how hard to push. Click it to override.",
  "Three things are enforced: an intent before you play, a log line before you resolve a scene, and a seed before you close. Everything else is optional.",
  "Work top to bottom. Press ? on any panel for what that panel wants.",
];

/* ---------- primitives ---------- */
const HelpCtx = React.createContext({ closed: {}, toggle: () => {} });
const Panel = ({ title, tag, helpId, children }) => {
  const { closed, toggle } = React.useContext(HelpCtx);
  const id = helpId || title;
  const text = HELP[id];
  const open = !!text && !closed[id];
  return (
    <div className="border border-stone-800 bg-stone-900/60">
      <div className="flex items-baseline justify-between gap-2 border-b border-stone-800 px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-stone-500">{title}</span>
        <span className="flex shrink-0 items-baseline gap-2">
          {tag && <span className="font-mono text-[10px] text-amber-500/80">{tag}</span>}
          {text && (
            <button
              onClick={() => toggle(id)}
              aria-expanded={open}
              aria-label={`${open ? "Hide" : "Show"} help for ${title}`}
              className={`h-4 w-4 border font-mono text-[10px] leading-none ${
                open ? "border-teal-700 text-teal-400" : "border-stone-700 text-stone-500 hover:border-stone-500"
              }`}
            >
              ?
            </button>
          )}
        </span>
      </div>
      {open && (
        <p className="border-b border-stone-800 bg-stone-950/60 px-3 py-2 text-xs leading-relaxed text-stone-400">{text}</p>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
};
// reason a disabled control is disabled, stated before the user clicks
const Hint = ({ children }) => <p className="mt-1.5 font-mono text-[10px] text-stone-500">{children}</p>;
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
  const [ui, setUi] = useState(null);
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
      // help state lives under its own key so "reset campaign" does not re-teach you
      try {
        const u = await storage.get(UIKEY);
        setUi(u ? { ...BLANK_UI, ...JSON.parse(u.value) } : BLANK_UI);
      } catch {
        setUi(BLANK_UI);
      }
    })();
  }, []);

  const putUi = (next) => {
    setUi(next);
    storage.set(UIKEY, JSON.stringify(next)).catch(() => {});
  };
  const toggleHelp = (id) => putUi({ ...ui, closed: { ...ui.closed, [id]: !ui.closed[id] } });

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

  if (!s || !ui) return <div className="min-h-screen bg-stone-950 p-6 font-mono text-xs text-stone-500">Loading campaign…</div>;

  const sess = s.session;
  const scene = sess?.scene;
  const sceneCount = sess?.scenes?.length ?? 0;

  /* ----- block reasons: stated up front, not after a failed click ----- */
  const noIntent = !sess?.intent?.trim();
  const noLog = !scene?.log?.trim();
  const seedQs = sess?.seedQ || ["", "", ""];
  const seedMissing = [
    !sess?.seedIntent?.trim() && "next intent",
    seedQs.filter((x) => x.trim()).length < 2 && "two cold questions",
    !sess?.seedHook?.trim() && "a hook",
    !sess?.verdict && "an answer to the intent (L2)",
  ].filter(Boolean);

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
        <Btn small onClick={() => putUi({ closed: {}, orientation: false })}>
          guide
        </Btn>
      </div>
    </div>
  );

  const Orientation = () =>
    ui.orientation ? null : (
      <div className="mb-3 border border-teal-900 bg-teal-950/20 px-3 py-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal-500">How this works</span>
          <button
            onClick={() => putUi({ ...ui, orientation: true })}
            className="shrink-0 border border-stone-700 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-stone-400 hover:border-stone-500"
          >
            got it
          </button>
        </div>
        <ol className="space-y-1.5 text-xs leading-relaxed text-stone-400">
          {ORIENTATION.map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-[10px] text-teal-700">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 font-mono text-[10px] text-stone-600">Bring this back any time with “guide” in the header.</p>
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
    <HelpCtx.Provider value={{ closed: ui.closed, toggle: toggleHelp }}>
    <div className="min-h-screen bg-stone-950 px-4 py-6 text-stone-300">
      <div className="mx-auto max-w-3xl">
        <Header />
        <Orientation />
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
                <div>
                  <Btn tone="go" onClick={startSession} disabled={noIntent}>
                    Frame scene 1 →
                  </Btn>
                  {noIntent && <Hint>Needs an intent above — one sentence that could turn out false.</Hint>}
                </div>
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

            <Panel title={`Scene ${sceneCount + 1} · Frame`} helpId="scene" tag={scene.complication}>
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
                  <Btn key={r.k} onClick={() => resolveScene(r.k)} disabled={noLog}>
                    {r.label}
                    <span className="ml-1 text-stone-600">{r.t > 0 ? "+1" : r.t < 0 ? "−1" : "0"}</span>
                  </Btn>
                ))}
              </div>
              {noLog && <Hint>Write the log line above to resolve this scene.</Hint>}
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

            <div>
              <Btn tone="cut" onClick={land} disabled={sceneCount < 1}>
                Land the session →
              </Btn>
              {sceneCount < 1 && <Hint>Resolve at least one scene first.</Hint>}
            </div>
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

            <div>
              <div className="flex gap-2">
                <Btn onClick={() => patch({ phase: "run" })}>← back to play</Btn>
                <Btn tone="go" onClick={closeSession} disabled={seedMissing.length > 0}>
                  Close session
                </Btn>
              </div>
              {seedMissing.length > 0 && <Hint>Still needed: {seedMissing.join(", ")}.</Hint>}
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
    </HelpCtx.Provider>
  );
}
