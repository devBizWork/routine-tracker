import { useState, type ReactNode } from 'react'
import { formatTime, readSettings, updateSettings, type Settings, type SettingsPatch } from '../../data'
import { useLiveQuery } from '../../data/useLiveQuery'
import { previewSound, unlockAudio } from '../../sound/audio'
import { chimeName } from '../../sound/chimes'
import { wakeLockSupported } from '../../sound/useWakeLock'
import { TimeBox } from '../tasks/fields'
import { ChimeSheet } from './ChimeSheet'
import { CHIME_CHOICES } from './chimeChoices'
import { Switch } from './Switch'

// Settings > SOUNDS (design/screens/Settings.html). Every tap on a sound control also unlocks audio,
// which iPhone needs before any chime can play.

function Row({ title, note, control, first = false, dim = false }: { title: string; note?: string; control: ReactNode; first?: boolean; dim?: boolean }) {
  return (
    <div className={`flex min-h-16 items-center gap-3 py-2.5 pr-3.5 pl-4 ${first ? '' : 'border-t border-line'}`}>
      <span className={`flex flex-1 flex-col gap-0.5 ${dim ? 'opacity-55' : ''}`}>
        <span className="text-15 font-semibold">{title}</span>
        {note && <span className="text-12-5 font-medium text-muted">{note}</span>}
      </span>
      {control}
    </div>
  )
}

const speaker = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 5 6.5 9H3.5v6h3l4.5 4z" />
    <path d="M15.5 9a4.5 4.5 0 0 1 0 6" />
  </svg>
)

export function SoundsSection() {
  const settings = useLiveQuery(readSettings)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!settings) return null

  const save = (patch: SettingsPatch) => {
    setError(null)
    void unlockAudio()
    updateSettings(patch).catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'That did not save.'))
  }
  const quiet: Settings['quietHours'] = settings.quietHours
  const wakeLock = wakeLockSupported()
  const off = !settings.soundsOn

  return (
    <section aria-labelledby="snd-h" className="mx-4 mt-[22px] flex flex-col gap-2">
      <h2 id="snd-h" className="m-0 flex items-center gap-1.5 px-1 font-sans text-12 font-extrabold tracking-[0.07em] text-muted">
        {speaker}
        SOUNDS
      </h2>
      <div className="overflow-hidden rounded-22 border border-line bg-card">
        <Row
          first
          title="Task-change chime"
          note="Plays when the planned block changes"
          control={<Switch label="Task-change chime" checked={settings.soundsOn} onChange={(v) => save({ soundsOn: v })} />}
        />
        <button
          type="button"
          onClick={() => {
            void unlockAudio()
            setPicking(true)
          }}
          className="flex min-h-[58px] w-full items-center gap-2.5 border-0 border-t border-line bg-transparent py-2.5 pr-3 pl-4 text-left text-ink"
        >
          <span className="flex-1 text-15 font-semibold">Chime</span>
          <span className="text-14 font-medium text-muted">{chimeName(settings.chimeId)}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
            <path d="M9.5 6l6 6-6 6" />
          </svg>
        </button>
        <Row
          title="Test sound"
          note="Also turns sound on for this visit"
          control={
            <button
              type="button"
              onClick={() => void previewSound(settings.chimeId)}
              className="flex h-11 items-center gap-1.5 rounded-22 border-0 bg-pill pr-4 pl-3 text-13-5 font-extrabold text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4.5v15l13-7.5z" fill="currentColor" />
              </svg>
              Play
            </button>
          }
        />
        <Row
          dim={off}
          title="5-minute warning"
          note="Before the next block starts"
          control={<Switch label="5-minute warning" checked={settings.warn5min} onChange={(v) => save({ warn5min: v })} />}
        />
        <Row
          dim={off}
          title="End-of-task sound"
          note="When a block's time is up"
          control={<Switch label="End-of-task sound" checked={settings.endSound} onChange={(v) => save({ endSound: v })} />}
        />
        <Row
          title="Quiet hours"
          note="No sounds between set times"
          control={<Switch label="Quiet hours" checked={quiet.on} onChange={(v) => save({ quietHours: { on: v } })} />}
        />
        {quiet.on && (
          <div className="grid grid-cols-2 gap-2 px-4 pb-3.5">
            <TimeBox
              caption="From"
              display={formatTime(quiet.from, settings.timeFormat)}
              value={quiet.from}
              ariaLabel={`Quiet from ${formatTime(quiet.from, settings.timeFormat)}`}
              onChange={(v) => v && save({ quietHours: { from: v } })}
            />
            <TimeBox
              caption="Until"
              display={formatTime(quiet.to, settings.timeFormat)}
              value={quiet.to}
              ariaLabel={`Quiet until ${formatTime(quiet.to, settings.timeFormat)}`}
              onChange={(v) => v && save({ quietHours: { to: v } })}
            />
          </div>
        )}
        <Row
          dim={!wakeLock}
          title="Keep screen on"
          note={wakeLock ? 'Stays awake during your routine so chimes keep playing' : 'Not supported on this device'}
          control={
            <Switch
              label="Keep screen on"
              checked={wakeLock && settings.keepScreenOn}
              disabled={!wakeLock}
              onChange={(v) => save({ keepScreenOn: v })}
            />
          }
        />
      </div>
      {error && (
        <p role="alert" className="m-0 px-1.5 text-12-5 font-semibold text-missed-text">
          {error}
        </p>
      )}
      <p className="m-0 mx-1.5 mt-0.5 flex gap-2 text-12-5 leading-[1.45] font-medium text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8v.01" />
        </svg>
        <span>
          Sounds play only while Routine Tracker is open on screen. If your iPhone's Silent switch is on, chimes may be
          muted.
        </span>
      </p>

      {picking && (
        <ChimeSheet
          title="Chime"
          choices={CHIME_CHOICES}
          value={settings.chimeId}
          onChange={(v) => save({ chimeId: v })}
          onClosed={() => setPicking(false)}
        />
      )}
    </section>
  )
}
