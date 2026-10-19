/**
 * The header-aligned content box: the same edges as EmployerHeader's inner row, so a
 * page's heading and cards start where the logo starts and end where the account menu ends.
 *
 * ⚠️ One complete literal on purpose. Tailwind finds classes by scanning source text
 * (`src/lib` is in its `content` list), so never build this from parts such as
 * `lg:px-[${n}px]` — the class would not be generated.
 *
 * Pages that need a narrower column keep this outer box and cap an inner element, e.g.
 * `<div className={PAGE_BOX}> … <div className="max-w-[800px]">`.
 */
export const PAGE_BOX = 'max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px]'
