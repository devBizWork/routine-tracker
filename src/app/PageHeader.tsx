// Screen title, styled like the <h1> in design/screens/Main.html. Titles are always ink.
export function PageHeader({ title }: { title: string }) {
  return (
    <header className="px-5" style={{ paddingTop: 'calc(var(--safe-top) + 20px)' }}>
      <h1 className="m-0 font-display text-34 leading-[1.1] font-bold tracking-[-0.03em]">
        {title}
      </h1>
    </header>
  )
}
