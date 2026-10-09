# CFSS UI Review Checklist

Use this checklist to verify UI changes before merging.

## Visuals
- [ ] No gradients, glows, neon, or glassmorphism used.
- [ ] No emojis used as UI elements.
- [ ] Typography uses system fonts with clear hierarchy.
- [ ] Cards use simple borders and minimal shadows, no colored left borders.
- [ ] Color palette strictly follows the CFSS brand (Green/White/Gray).

## Layout & Components
- [ ] Layout matches the task (Tables for records, forms for entry).
- [ ] No unnecessary nested cards or excessive whitespace.
- [ ] Mobile responsive: layouts stack correctly, tap targets are large enough.
- [ ] Shared components (buttons, inputs) used consistently instead of inline styles.

## Accessibility
- [ ] WCAG 2.2 AA contrast met for text and interactive elements.
- [ ] Keyboard navigable with visible focus states (`focus:ring`).
- [ ] Semantic HTML used (headings, nav, main).
- [ ] Forms have visible labels, clear error states, and correct input types.

## Functionality
- [ ] Buttons have loading, disabled, and active states.
- [ ] Data shown is real (or appropriately mocked for dev), not hardcoded placeholders.
- [ ] Business logic and workflows (sync, submission) remain intact.
