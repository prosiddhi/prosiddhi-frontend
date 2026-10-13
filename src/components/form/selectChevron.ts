// Class strings that swap a <select>'s native arrow for our own, set in from the
// right edge. The browser draws its arrow ~8px from the border; with `px-3` that
// reads as jammed against the edge, and long option text can run under it.
//
// `pr-10` keeps the selected text clear of the arrow. The chevron is a
// background image, so no wrapper element is needed. Underscores inside `url()`
// are NOT turned into spaces by Tailwind, so the SVG uses %20.
//
// Use SELECT_CHEVRON_CLS on a plain <select>. Use SELECT_ONLY_CHEVRON_CLS where
// the same class string is also applied to a non-select (TaxonomyPicker puts its
// `selectClassName` on its search <input> too) — each class is scoped to
// `select` elements so the input is left alone. The two strings are written out
// in full because Tailwind only generates classes it can read literally.

export const SELECT_CHEVRON_CLS =
  "appearance-none pr-10 bg-no-repeat bg-[length:1rem] bg-[position:right_0.875rem_center] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2020%2020%27%20fill=%27none%27%3E%3Cpath%20d=%27M5%207.5l5%205%205-5%27%20stroke=%27%23676767%27%20stroke-width=%271.8%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')]"

export const SELECT_ONLY_CHEVRON_CLS =
  "[&:is(select)]:appearance-none [&:is(select)]:pr-10 [&:is(select)]:bg-no-repeat [&:is(select)]:bg-[length:1rem] [&:is(select)]:bg-[position:right_0.875rem_center] [&:is(select)]:bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2020%2020%27%20fill=%27none%27%3E%3Cpath%20d=%27M5%207.5l5%205%205-5%27%20stroke=%27%23676767%27%20stroke-width=%271.8%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/%3E%3C/svg%3E')]"
