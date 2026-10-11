const plus = (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const STEPS = ['Block out the day', 'Follow the blocks', 'Log what happened', 'Review and adjust']

/** No tasks at all (design/screens/FirstRun.html). */
export function FirstRun({ onAddBlock, onJotTodo }: { onAddBlock: () => void; onJotTodo: () => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
      {/* A tiny picture of a timeline */}
      <div aria-hidden="true" className="relative mx-auto mt-[34px] h-[132px] w-[250px]">
        {[6, 50, 94].map((top) => (
          <span key={top} className="absolute inset-x-0 h-px bg-line" style={{ top }} />
        ))}
        {[
          ['7', 0],
          ['8', 44],
          ['9', 88],
        ].map(([label, top]) => (
          <span
            key={label}
            className="absolute left-0 bg-ground pr-1.5 text-10 font-bold text-unknown-edge"
            style={{ top }}
          >
            {label}
          </span>
        ))}
        <span className="absolute top-[10px] right-[30px] left-[26px] h-9 rounded-12 bg-cat-movement" />
        <span className="absolute top-[54px] right-[90px] left-[26px] h-[18px] rounded-8 bg-cat-admin" />
        <span className="absolute top-[78px] right-0 left-[26px] box-border h-[50px] rounded-12 border-2 border-primary bg-cat-focus" />
        <span className="absolute top-[102px] right-0 left-4 h-0.5 bg-primary" />
        <span className="absolute top-[98px] left-3 size-2.5 rounded-5 bg-primary" />
      </div>

      <div className="mx-7 mt-[22px] flex flex-col items-center gap-2 text-center">
        <h2 className="m-0 font-display text-27 leading-[1.15] font-bold tracking-[-0.01em]">
          Block out your first day
        </h2>
        <p className="m-0 text-15 leading-[1.5] font-medium text-balance text-muted">
          Give each task a start time and a length. Routines repeat on their own, so tomorrow starts half planned.
        </p>
      </div>

      <div className="mx-6 mt-5 flex flex-col gap-1">
        <button
          type="button"
          onClick={onAddBlock}
          className="flex h-[54px] items-center justify-center gap-2.5 rounded-27 border-0 bg-primary text-16 font-bold text-on-primary"
        >
          {plus}
          Add a time block
        </button>
        <button
          type="button"
          onClick={onJotTodo}
          className="flex h-11 items-center justify-center border-0 bg-transparent text-14-5 font-bold text-primary"
        >
          Or jot a to-do in the inbox
        </button>
      </div>

      <section aria-labelledby="loop-h" className="mx-4 mt-[18px] flex flex-col gap-2">
        <h3 id="loop-h" className="m-0 px-1 font-sans text-12 font-extrabold tracking-[0.07em] text-muted">
          HOW IT WORKS
        </h3>
        <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0">
          {STEPS.map((step, i) => (
            <li key={step} className="flex flex-col gap-1.5 rounded-18 border border-line bg-card p-3">
              <span className="flex size-6 items-center justify-center rounded-12 bg-pill text-12 font-extrabold text-primary">
                {i + 1}
              </span>
              <span className="text-13-5 leading-[1.3] font-bold">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

/** Tasks exist, but none of them fall on today. */
export function NothingToday({ onAddBlock }: { onAddBlock: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-8 pb-10 text-center">
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-pill text-primary"
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </span>
      <h2 className="m-0 font-display text-24 leading-[1.15] font-bold tracking-[-0.01em]">
        Nothing planned today
      </h2>
      <p className="m-0 text-15 leading-[1.5] font-medium text-balance text-muted">
        None of your tasks fall on today. Add a block to plan something.
      </p>
      <button
        type="button"
        onClick={onAddBlock}
        className="mt-1 flex h-[54px] items-center justify-center gap-2.5 rounded-27 border-0 bg-primary px-7 text-16 font-bold text-on-primary"
      >
        {plus}
        Add a time block
      </button>
    </div>
  )
}
