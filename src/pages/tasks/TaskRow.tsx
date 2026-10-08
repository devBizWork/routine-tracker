import {
  categoryColor,
  formatDateLabel,
  formatDuration,
  formatRepeat,
  formatTime,
  type Task,
  type TimeFormat,
} from '../../data'

const chevron = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className="shrink-0 text-muted"
  >
    <path d="M9.5 6l6 6-6 6" />
  </svg>
)

/** A scheduled task: color square, title, then "Daily · 6:30 am · 60 min". */
export function TaskRow({
  task,
  timeFormat,
  today,
  onOpen,
}: {
  task: Task
  timeFormat: TimeFormat
  today: string
  onOpen: () => void
}) {
  const repeating = task.repeat.kind !== 'once'
  const label = repeating
    ? formatRepeat(task.repeat)
    : task.date
      ? formatDateLabel(task.date, today)
      : 'Once'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[62px] w-full items-center gap-3 border-0 bg-transparent py-2.5 pr-3 pl-3.5 text-left text-ink"
    >
      <span
        aria-hidden="true"
        className="size-10 shrink-0 rounded-12"
        style={{ background: categoryColor(task.color) }}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-15 font-bold break-words">{task.title}</span>
        <span className="text-12-5 font-medium text-muted">
          <span className={`font-bold ${repeating ? 'text-primary' : 'text-ink'}`}>{label}</span>
          {task.startTime && ` · ${formatTime(task.startTime, timeFormat)}`} · {formatDuration(task.plannedMinutes)}
        </span>
      </span>
      {chevron}
    </button>
  )
}
