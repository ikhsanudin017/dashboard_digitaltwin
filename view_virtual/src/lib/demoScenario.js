const round = (value, digits = 1) => {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

const DEMO_CYCLE_SECONDS = 120

const phaseKeyForSecond = second => {
  if (second < 30) return 'occupied'
  if (second < 60) return 'cooling'
  if (second < 90) return 'optimized'
  return 'eco'
}

/**
 * Deterministic telemetry replay for demonstrations without sensor connectivity.
 * Values are intentionally plausible, repeatable, and explicitly tagged as replay.
 */
export const getDemoTelemetry = (elapsedSeconds = 0, now = new Date()) => {
  const second = ((Math.floor(elapsedSeconds) % DEMO_CYCLE_SECONDS) + DEMO_CYCLE_SECONDS) % DEMO_CYCLE_SECONDS
  const phaseKey = phaseKeyForSecond(second)
  const wave = Math.sin((second / DEMO_CYCLE_SECONDS) * Math.PI * 2)
  const fineWave = Math.sin((second / 17) * Math.PI * 2)

  const phaseValues = {
    occupied: { temperature: 29.4, humidity: 68.2, power: 176, peopleCount: 2 },
    cooling: { temperature: 28.7, humidity: 66.8, power: 428, peopleCount: 3 },
    optimized: { temperature: 26.3, humidity: 63.4, power: 312, peopleCount: 3 },
    eco: { temperature: 27.1, humidity: 64.1, power: 148, peopleCount: 1 }
  }[phaseKey]

  const voltage = 220 + wave * 1.4 + fineWave * 0.35
  const power = phaseValues.power + wave * 10 + fineWave * 4

  return {
    temperature: round(phaseValues.temperature + wave * 0.25, 1),
    humidity: round(clamp(phaseValues.humidity + fineWave * 0.6, 35, 85), 1),
    voltage: round(voltage, 1),
    current: round(power / voltage, 2),
    power: round(power, 1),
    voltageStatus: 'normal',
    currentStatus: 'normal',
    peopleCount: phaseValues.peopleCount,
    lastPeopleUpdate: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    timestamp: now.toISOString(),
    timestampDisplay: now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    dataSource: 'demo_replay'
  }
}

/** Build a stable history so Analytics and Energy have useful demo data. */
export const createDemoHistory = ({
  hours = 168,
  intervalMinutes = 15,
  endTime = new Date()
} = {}) => {
  const safeHours = clamp(Math.ceil(Number(hours) || 168), 1, 720)
  const safeInterval = clamp(Math.ceil(Number(intervalMinutes) || 15), 5, 60)
  const points = Math.floor((safeHours * 60) / safeInterval) + 1
  const endMs = new Date(endTime).getTime()
  const intervalMs = safeInterval * 60 * 1000

  return Array.from({ length: points }, (_, index) => {
    const timestampMs = endMs - (points - index - 1) * intervalMs
    const date = new Date(timestampMs)
    const hour = date.getHours() + date.getMinutes() / 60
    const dayIndex = Math.floor(timestampMs / 86400000)
    const occupied = (hour >= 6 && hour < 9) || (hour >= 17 && hour < 23)
    const peopleCount = occupied ? (hour >= 18 && hour < 22 ? 3 : 2) : 0
    const daytimeHeat = Math.max(0, Math.sin(((hour - 7) / 14) * Math.PI))
    const periodic = Math.sin((index / 9) * Math.PI * 2 + dayIndex * 0.3)
    const applianceLoad = hour >= 18 && hour < 22 ? 255 : hour >= 6 && hour < 9 ? 145 : 62
    const power = applianceLoad + peopleCount * 18 + daytimeHeat * 42 + periodic * 9
    const voltage = 220 + Math.sin((index / 13) * Math.PI * 2) * 1.8

    return {
      timestamp: date.toISOString(),
      temperature: round(25.8 + daytimeHeat * 3.2 + peopleCount * 0.18 + periodic * 0.2, 1),
      humidity: round(clamp(69 - daytimeHeat * 7 + periodic * 0.7, 45, 82), 1),
      voltage: round(voltage, 1),
      current: round(power / voltage, 2),
      power: round(power, 1),
      peopleCount,
      dataSource: 'demo_replay'
    }
  })
}

export const getDemoVisionState = elapsedSeconds => {
  const telemetry = getDemoTelemetry(elapsedSeconds)
  const boxes = [
    { id: 1, left: 18, top: 22, width: 18, height: 58 },
    { id: 2, left: 43, top: 17, width: 17, height: 63 },
    { id: 3, left: 68, top: 25, width: 16, height: 55 }
  ]

  return {
    peopleCount: telemetry.peopleCount,
    detections: boxes.slice(0, telemetry.peopleCount)
  }
}

export { DEMO_CYCLE_SECONDS }
