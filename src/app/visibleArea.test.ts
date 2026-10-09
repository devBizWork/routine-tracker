import { describe, expect, it } from 'vitest'
import { visibleArea } from './visibleArea'

describe('visibleArea', () => {
  it('is the whole screen when no keyboard is open', () => {
    expect(visibleArea({ offsetTop: 0, height: 844 })).toEqual({ top: 0, height: 844 })
  })

  it('shrinks to what is left above the keyboard', () => {
    // An iPhone keyboard takes roughly 300 to 350 pixels.
    expect(visibleArea({ offsetTop: 0, height: 510 })).toEqual({ top: 0, height: 510 })
  })

  it('follows the page when Safari slides it up to show a field', () => {
    expect(visibleArea({ offsetTop: 120, height: 510 })).toEqual({ top: 120, height: 510 })
  })

  it('rounds half pixels and never goes negative', () => {
    expect(visibleArea({ offsetTop: 0.4, height: 509.6 })).toEqual({ top: 0, height: 510 })
    expect(visibleArea({ offsetTop: -3, height: -5 })).toEqual({ top: 0, height: 0 })
  })
})
