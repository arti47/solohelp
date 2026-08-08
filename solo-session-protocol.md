# SOLO SESSION PROTOCOL v1.0
System-agnostic. Bolt onto any RPG engine. Three phases: **OPEN → RUN → LAND**.

Design premise: your apps already answer *"what happens?"* (oracles, tables, moves).
They do not answer *"when do I start, when do I stop, and why do I come back?"*
That is a **state + pacing** problem, not a content problem. This spec fixes that.

---

## 0. PERSISTENT STATE (the save file)

Everything below is campaign-level, not session-level. Nothing else persists.

| Field | Type | Cap | Purpose |
|---|---|---|---|
| `threads[]` | open question + status | 6 | What is unresolved. The engine of return. |
| `cast[]` | name + want + disposition | 10 | Who can act on you. |
| `clocks[]` | label + filled/segments | 4 | Offscreen pressure that advances without you. |
| `pc` | resources, condition, position | 1 | Continuity across gaps. |
| `world_status` | 3–5 bullets | — | What changed that you didn't do. |
| `tension` | 1–9 dial | 1 | Volatility knob (see §2.4). |
| `seed` | next intent + 2–3 cold questions + 1 hook | 1 | **The single most important field.** |

**Rule:** if `seed` is empty, the session did not end — it was abandoned. Abandoned
sessions are the #1 cause of dead solo campaigns.

Caps are load-bearing. Over 6 threads you get paralysis; the app should force a
merge or close before allowing a 7th.

---

## 1. OPEN — 5 steps, target 3 minutes

Never start cold. Never start with worldbuilding.

### O1. RECAP
Read last session's log bullets (max 5) and `seed`. Do not re-read the whole journal.

### O2. STATE CHECK
- PC: wounds, supplies, money, condition, position.
- Elapsed in-world time since last scene → apply to PC and to `clocks`.
- Advance each clock by 0–1 segment based on time elapsed. Ask oracle if unsure.

### O3. WORLD TICK
Answer the 2–3 cold questions stored in `seed`, using the oracle. Log answers to
`world_status`. This makes the world feel like it moved without you.

Example cold questions:
- "Has the Warden discovered the body yet?" → *No, but* — someone else has.
- "Is the caravan still in town?" → *Yes, and* — it's leaving at dawn.

### O4. DECLARE INTENT (mandatory)
Write one sentence, in this exact shape:

> **This session, [PC] will try to [concrete action] so that [thread advances].**

Constraints:
- Must be answerable **yes / no / complicated** by session end.
- Must reference an existing `thread`.
- Must be achievable in 3–5 scenes.

Good: *"Kess will try to bribe the dock registrar so that she learns which ship carried the relic."*
Bad: *"Kess will explore the city."* (unfalsifiable → no ending → no satisfaction)

### O5. FRAME SCENE 1
Use the FRAME handles (§2.1). Then run your engine's scene-disruption check
(Mythic: expected/altered/interrupt vs Chaos; OPSE: scene complication; or your own).

---

## 2. RUN — the scene loop

```
FRAME → PLAY → PRESSURE → RESOLVE → LOG → LINK → (repeat)
```

Session length = **3–5 scenes**, or a hard wall clock (45–90 min). Whichever hits first.
Fewer than 3 = no arc. More than 5 = you will not log properly and momentum dies.

### 2.1 FRAME — 4 handles, one line each
| Handle | Question |
|---|---|
| **WHERE** | What does the place look/smell/sound like? One sensory detail only. |
| **WHO** | Who else is present? Pull from `cast` when possible, generate only if needed. |
| **WANT** | What does the PC want *out of this scene*? Must be smaller than the session intent. |
| **WHY NOW** | What makes this urgent? A clock, a deadline, a departure, a threat. |

If WHY NOW is blank, the scene will sag. Roll a complication or skip the scene.

### 2.2 PLAY — oracle discipline
Ask the oracle only when **(a)** you don't know AND **(b)** the answer changes what
you do next. Otherwise just narrate. Over-asking is a stall disguised as play.

**Ban plain yes/no.** A bare "yes" resolves without consequence and hands the whole
creative burden back to you — the classic dead-end. Force a modifier:

| Result | Meaning | Obligation |
|---|---|---|
| Yes, and | you get it + bonus | name the bonus now |
| Yes | you get it | **re-roll or add a "but"** |
| Yes, but | you get it + cost | name the cost now |
| No, but | denied + consolation | name the consolation |
| No | denied | **re-roll or add an "and"** |
| No, and | denied + escalation | name the escalation |

Question phrasing rules:
- Ask about **the world**, not about your own choices. ✔ "Is the gate guarded?" ✘ "Should I go left?"
- Ask **closed** questions with a stated expectation, so the answer can surprise you.
- Ask **consequential** questions. If both answers lead to the same next action, don't ask.
- Chain max 3 oracle questions before you must narrate something. (3-question rule.)

### 2.3 PRESSURE — three triggers, three responses
| Trigger | Response |
|---|---|
| Lull / "what now?" | **Pacing move** — foreshadow trouble, reveal a detail, an NPC acts, advance a threat |
| PC fails an important check | **Failure move** — cost, complication, or escalation; never "nothing happens" |
| End of every 2nd scene | **Clock tick** — advance one clock by 1 segment |

The lull → pacing-move reflex is the single highest-value mechanic to build into an app.
It is what a live GM does automatically and what solo players lack.

### 2.4 TENSION DIAL (1–9)
- PC ended scene **more** in control → dial **−1**
- PC ended scene **less** in control → dial **+1**

Higher dial = more interrupts, more complications, harsher failure moves, more likely
"yes" to dangerous questions. This is the Mythic Chaos Factor generalized; keep it even
if you don't use Mythic. It is your automatic difficulty curve.

### 2.5 RESOLVE — scene ends on ONE of four triggers
1. **Won** — the scene WANT is achieved.
2. **Denied** — the WANT is definitively blocked.
3. **Pivot** — new information makes the WANT irrelevant.
4. **Cost** — you got it but paid something that changes the situation.

If none has fired in ~15 minutes: force one. Cut to the consequence.
"CUT TO:" is a legal move. Skipping travel, negotiation, and searching is not cheating.

### 2.6 LOG — one line, immediately, before the next frame
Format: `S3 — [what happened] → [what changed]`
Then update: threads (add/close), cast (add/change disposition), clocks, PC.
Do not defer logging to end of session. Deferred logging = no logging.

### 2.7 LINK — the continuity rule
The next scene must inherit **at least one** of: a person, an object, an unanswered
question, or a threat from the scene just ended. This is what turns a sequence of
scenes into a story. Enforce it mechanically.

---

## 3. LAND — 6 steps, target 3 minutes

Ending well is 80% of whether you return.

### L1. CHOOSE THE CUT POINT
End on **a decision, a door, or a revelation.** Never at rest, never mid-combat.
The last thing you write should make you want to know the next thing.

Good cuts: PC agrees to the meeting / the door opens on something unexpected / the
letter names someone you trusted.
Bad cuts: PC goes to sleep at the inn. (Nothing pulls you back.)

### L2. ANSWER THE INTENT
Write: **yes / no / complicated** against the O4 sentence. One line of why.
This is the session's "score." Without it a session has no shape.

### L3. LOG — max 5 bullets
Only what future-you needs. Not prose. Not a novel.

### L4. STATE DELTA
- PC status
- `world_status` — what changed offscreen or as fallout
- clocks — final positions
- threads — mark closed, add new (respect the cap of 6)
- cast — new NPCs, changed dispositions, deaths

### L5. SET THE TENSION DIAL
Final value carries to next session's O5.

### L6. WRITE THE SEED (non-negotiable)
1. Next session intent (one sentence, O4 shape)
2. Two or three cold questions about world/people/factions
3. One hook: an image, a line of dialogue, or a threat

If you can only do one thing at end of session, do L6.

---

## 4. ABOVE THE SESSION: arcs and endings

| Layer | Length | Ends when |
|---|---|---|
| Scene | 10–20 min | one of the four resolve triggers |
| Session (episode) | 3–5 scenes | intent answered + seed written |
| Arc | 5–8 sessions | the arc's driving thread resolves |
| Campaign | 2–5 arcs | PC's stated motivation is satisfied, betrayed, or made impossible |

**Declaring endgame.** When the main thread is ≤3 steps from resolution, flip a switch:
- Stop opening new threads. Close or abandon side threads explicitly.
- Fill remaining clocks faster (2 segments per session).
- Raise the tension dial floor to 6.
- Name the final confrontation *now*, before you play it.

**Finale checklist:** main thread resolved · each surviving cast member's fate stated
· each clock either fired or defused · one line of epilogue per open thread you're
choosing to leave open (these become hooks for the next campaign).

**Permission to end early.** A campaign that stops at a clean arc close is a finished
campaign, not a failure. Log it as complete and start a new one deliberately.

---

## 5. FAILURE MODES → FIXES

| Symptom | Cause | Fix |
|---|---|---|
| Can't start | starting cold | seeds are mandatory (L6) |
| Endless prep, no play | prep ≠ play | sketch only: one base + 2–3 locations, sprinkle lore during play |
| Analysis paralysis over tools | too many oracles/tables | core rules + **one** supplement, hard limit |
| Story goes nowhere | no goal | session intent (O4) + thread list |
| Scenes feel flat | no WHY NOW | complication on every scene frame |
| Oracle answers deaden the story | plain yes/no | ban bare answers, force and/but |
| Session peters out | no cut point | choose the cut (L1) before you get tired |
| Forgot everything, quit | deferred logging | log per scene (2.6) |
| System hopping | boredom mislabeled as system fault | keep setting + PC, swap rules; or run 2 campaigns of different genre |
| Perfectionism paralysis | treating it as a public artifact | retcon freely; declare new canon; move on |

---

## 6. WORKED EXAMPLE (compressed, fantasy)

**Seed from last time:** intent = *learn which ship carried the relic*; cold Qs =
(a) has the registrar been replaced? (b) is the harbour under curfew? hook = *a gull
with a brass ring on its leg.*

- **O3 Tick.** (a) *No, but* he's been reassigned to nights. (b) *Yes, and* the curfew
  is enforced by outsiders, not city watch. → `world_status`: foreign authority in the port.
- **O4 Intent.** "Kess will try to bribe the night registrar so she learns which ship carried the relic."
- **O5 Frame S1.** WHERE: tallow smoke, wet rope. WHO: the registrar (cast). WANT: get the
  manifest. WHY NOW: curfew in one hour. Complication rolled: *all is not as it seems.*
- **Play.** Q: "Is he already being watched?" (expectation: no) → **Yes, but** the watcher
  is asleep. Kess proceeds.
- **Pressure.** Failed persuasion check → failure move: he takes the coin *and* keeps the manifest.
- **Resolve.** Type 4 (Cost): she has the ship name, he has leverage over her.
- **Log.** `S1 — bribed registrar, got ship name "Corvid" → registrar now holds leverage.`
  Threads +1 *"registrar can expose Kess."* Tension +1 (less in control).
- **Link.** S2 inherits: the sleeping watcher.
- ... S2, S3 ...
- **L1 Cut.** The Corvid's berth is empty and freshly scrubbed. (Revelation.)
- **L2 Intent answered:** *Complicated* — ship identified, ship gone.
- **L6 Seed.** Next intent: *find where the Corvid went.* Cold Qs: does the registrar
  talk? is the brass-ringed gull someone's messenger? Hook: scrubbed berth, smell of lye.

---

## 7. APP SPEC (if you fold this into your builds)

**Data model**
```
Campaign { threads[6], cast[10], clocks[4], pc, world_status, tension, seed, sessions[] }
Session  { intent, intent_result, scenes[], log[5], deltas, tension_out, seed_out }
Scene    { where, who, want, why_now, complication, oracle_calls[], resolve_type, log_line, link }
```

**Screens (3 only)**
1. **Open** — recap card, state check, cold-question answerer, intent field (blocks progress if empty), frame scene 1.
2. **Run** — persistent header (intent · tension · clocks) + scene card + three big buttons: `ORACLE` `PACING MOVE` `FAILURE MOVE` + resolve picker (4 types) + one-line log field.
3. **Land** — cut-point prompt, intent verdict, 5-bullet log, delta editors, tension setter, **seed form (cannot exit without it)**.

**Enforcement rules worth hard-coding**
- Cannot start a session with an empty `seed` → force a generated one.
- Cannot exit a session without `seed_out`.
- Oracle returns no bare yes/no — always a modifier.
- Warn at 3 consecutive oracle calls with no log entry (stall detector).
- Auto-suggest a pacing move after 5 min of no input (lull detector).
- Block a 7th thread until one is closed or merged.
- Tension auto-adjusts from `resolve_type` (Won −1, Denied +1, Pivot 0, Cost +1).
- Session ends → prompt at 3 scenes, hard prompt at 5.

**Portability**: this layer never touches your resolution mechanics. Any system's dice
sit inside PLAY. Any oracle sits inside the ORACLE button. Swap engines freely.

---

## 8. EXISTING TOOLS WORTH MINING

| Tool | Take this from it |
|---|---|
| Mythic GME 2e | scene structure (expected/altered/interrupt), Chaos Factor, threads & characters lists |
| One Page Solo Engine | pacing moves, failure moves, scene complications — the anti-lull layer |
| Ironsworn | progress clocks/tracks, move-driven pacing, explicit campaign endgame |
| The Adventure Crafter | turning-point/plot-point generation for arc-level structure |
| Wretched & Alone SRD | hard, built-in ending condition — study for *how to make a game stop* |
| 9 Questions (John Fiore) | screenwriting-derived episode scaffold |
| Arc Driver | 8-step three-act framework over a session sequence |

---

## 9. ONE-PAGE CARD

**OPEN** Recap · State check · Tick the world (2–3 Qs) · **Declare intent** · Frame scene 1
**RUN** Frame (where/who/want/why now) → Play (no bare yes/no, 3-Q max) → Pressure (lull→pacing, fail→failure, every 2nd scene→clock) → Resolve (won/denied/pivot/cost) → Log 1 line → Link
**LAND** Cut on decision/door/revelation · Answer intent · 5 bullets · Deltas · Tension · **Seed**
