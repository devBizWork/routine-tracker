import type { ReactNode } from 'react'

// Screen title, styled like the <h1> in design/screens/Main.html. Titles are always ink.
// `trailing` is the small text at the right of the title (for example "14 tasks").
export function PageHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <header
      className="flex items-end justify-between gap-3 px-5"
      style={{ paddingTop: 'calc(var(--safe-top) + 20px)' }}
    >
      <h1 className="m-0 font-display text-34 leading-[1.1] font-bold tracking-[-0.03em]">{title}</h1>
      {trailing}
    </header>
  )
}
