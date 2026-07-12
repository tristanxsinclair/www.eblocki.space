# Expected vs Actual Judgment Feedback

**Feature Status:** Implemented (July 2026)
**Location:** Proof page (`/proof`)
**Goal:** Help users see the gap between how strong they *think* their proof is and how strong it actually scored.

## Purpose

This feature directly supports Eblocki’s core doctrine of **Proof over Intention** by making self-assessment visible and honest. It helps users notice when they are overconfident or under-confident in their own work.

It primarily targets two cognitive biases:
- **Overconfidence Effect**
- **Dunning-Kruger Effect**

## What the Feature Does

### Before Submission
- Users can optionally select how strong they expect their proof to be (Weak / Moderate / Strong / Elite).
- Input is fully optional and can be cleared at any time.

### After Verdict
- The system shows a clear comparison:
  - You expected: **Strong**
  - Actual result: **Moderate**
- A short, kind message is shown: “This is common — many people think their proof is stronger than it scores.”

### Light Reflection Prompt
- After the comparison, users see an optional prompt:
  > What made you expect that strength?
- This reuses the existing reflection field and is saved with the proof.

## Accessibility & Interaction

The input uses a button group with full accessibility support:

- **ARIA roles**: `role="radiogroup"` + `role="radio"` with `aria-checked`
- **Keyboard navigation**: Arrow keys (Left/Right/Up/Down) with wrap-around
- **Touch gestures**: Swipe left/right to change selection
- **Clear button**: Visible only when a value is selected
- **Focus management**: Proper `tabIndex` handling

The input was moved higher in the form for better visibility and usability.

## Why This Matters

Seeing the gap between expected and actual strength helps users develop better calibration over time. This is one of the most practical ways to reduce self-deception in proof submission.

It turns a moment of potential disappointment into a moment of learning and honesty.

## Current Limitations

- The comparison is per-submission only (no long-term trend view yet).
- The reflection prompt reuses the general reflection field (not a dedicated field).

## Future Possibilities

- Add a simple calibration trend view ("You're getting better at judging your proofs")
- Track average gap over time per user
- Make the expected strength input smarter (pre-fill based on past behavior)
- Surface common bias patterns gently in the Coach

## Related Concepts

- Cognitive Bias Countermeasures
- Metacognition
- Calibration Training
- Proof over Intention

---

*Document created: July 2026*