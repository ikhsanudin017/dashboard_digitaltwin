import { describe, expect, it } from 'vitest'
import { createDemoHistory, getDemoTelemetry, getDemoVisionState } from './demoScenario'

describe('demoScenario', () => {
  it('produces deterministic and plausible telemetry', () => {
    const now = new Date('2026-08-15T12:00:00Z')
    const first = getDemoTelemetry(42, now)
    const second = getDemoTelemetry(42, now)

    expect(second).toEqual(first)
    expect(first.dataSource).toBe('demo_replay')
    expect(first.voltage).toBeGreaterThanOrEqual(215)
    expect(first.voltage).toBeLessThanOrEqual(225)
    expect(first.power).toBeGreaterThan(0)
    expect(first.current).toBeCloseTo(first.power / first.voltage, 1)
  })

  it('creates ordered history for analytics', () => {
    const history = createDemoHistory({
      hours: 24,
      intervalMinutes: 15,
      endTime: new Date('2026-08-15T12:00:00Z')
    })

    expect(history).toHaveLength(97)
    expect(new Date(history[0].timestamp).getTime()).toBeLessThan(new Date(history.at(-1).timestamp).getTime())
    expect(history.every(point => point.dataSource === 'demo_replay')).toBe(true)
  })

  it('keeps people count synchronized with vision detections', () => {
    const state = getDemoVisionState(40)
    expect(state.detections).toHaveLength(state.peopleCount)
  })
})
