# Gym exercise catalogue — what to add, and what to be careful about

Research notes for extending the seeded library beyond the 21 bodyweight exercises it ships with.
Written 2026-08-31.

## The one structural finding

The **30-Minute Express Circuit** is the format worth supporting, and it maps onto the routine
model already built with no schema change:

- **20 numbered stations**, alternating 10 strength machines with 10 step platforms.
- **60 seconds work, 30 seconds transition**, signalled by a green/red light.
- Ordered: cardio station, then a strength machine for a large muscle group, and repeat.

In this app that is a routine whose steps alternate `machine` and `step platform`, each with
`durationSec: 60` and `restAfterSec: 30`. The existing `RoutineStep` carries all of it. The
circuit is also the right beginner on-ramp, which is what makes it worth doing first.

## Machines to add, grouped for the `muscleGroup` field

The library already has `muscleGroup` and `equipment` as searchable free text, so these arrive as
records rather than as a schema change.

| Muscle group | Machines |
|---|---|
| Chest | Chest press, pec fly / rear delt |
| Back | Lat pulldown, seated row, assisted pull-up (Gravitron) |
| Shoulders | Shoulder press, lateral raise |
| Arms | Bicep curl, tricep extension |
| Legs | Leg press, leg extension, seated leg curl, lying leg curl, calf raise, hack squat |
| Hips / glutes | Hip abductor, hip adductor, glute kickback |
| Core | Ab crunch, rotary torso, back extension, captain's chair |
| Cable / functional | Cable crossover, single pulley station, Smith machine |
| Cardio | Treadmill, elliptical, upright bike, recumbent bike, stair climber, arc trainer, rower |

Free weights are dumbbells (5–75 lb) and fixed barbells (20–60 lb) with flat and adjustable
benches. Deliberately **absent** from these gyms, so exercises requiring them do not belong in a
gym-floor routine: Olympic barbells, squat and power racks, deadlift platforms, bumper plates,
kettlebells.

## One model gap this exposes

Exercises and routines have no **skill level**. The circuit is a beginner protocol, the machine
work is not, and the whole reason for wanting a gym catalogue was "when I know my skill level".

Add `level: 'beginner' | 'intermediate' | 'advanced'` to `Exercise` and `Routine`, filterable in
the library the way `phase` already is. That is a small change to `types/fitness.ts` plus a filter
chip row, and it should land **before** a few dozen machine exercises arrive — retrofitting a
level onto records already in someone's store is a migration, whereas adding the field first is
just a default.

## ⚠️ Naming and content: do not ship the brand

This matters more than the exercise data, because this app is a candidate Ask2App template and a
template is redistributed.

- **"Planet Fitness" is a trademark.** A template, routine or import named after it implies an
  association that does not exist. Name it for what it is — **"Gym Machine Circuit"**, or
  "30-Minute Machine Circuit".
- **Their published articles are copyrighted, and their site refuses automated fetches** (the
  beginner-circuit article returns HTTP 403). Do not copy their instructional text.
- **What is safe** is the part that is not theirs: machine names like "chest press" and "leg
  press" are generic equipment terms, and a 60-seconds-on / 30-seconds-transition structure is a
  fact about how a circuit is run, not an expression of it. Instructions, tips and modifications
  should be written fresh, the way the existing 21 seeded exercises were.
- **There is no official public equipment list**, and every source says the lineup **varies by
  location**. So the catalogue is a starting point a user edits, not a promise about any
  particular gym — which is exactly why the library is editable.

## Suggested order of work

1. Add `level` to the model and a filter chip in the library. Small, and cheaper before the data.
2. Seed the machine exercises above with fresh instructions, `equipment` set to the machine name
   and `source: 'import'` with an `importTag` such as `gym-machines`, so the whole set can be
   removed later without touching anything hand-written.
3. Ship a **"Gym Machine Circuit"** routine at 60/30 alternating machine and step.
4. Only then consider cardio machines, which are mostly a duration and a name.

## Sources

- [Planet Fitness equipment list — PF Guides](https://pfguides.com/planet-fitness-equipment-list/)
- [Planet Fitness machines explained](https://otfworkouttoday.com/planet-fitness/planet-fitness-machines/)
- [30-minute circuit walkthrough](https://www.statisticool.com/exercise/pfcircuit.html)
- [PF mobile app](https://www.planetfitness.com/mobileapp) and
  [free fitness training (PE@PF)](https://www.planetfitness.com/about-planet-fitness/pe-pf)
