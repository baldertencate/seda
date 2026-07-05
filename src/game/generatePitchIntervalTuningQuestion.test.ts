import { describe, expect, it } from 'vitest'
import {
  generatePitchIntervalTuningQuestion,
  isPitchIntervalTuningQuestion,
  pitchIntervalTuningTargets,
} from './generatePitchIntervalTuningQuestion'

describe('generatePitchIntervalTuningQuestion', () => {
  it('creates a valid interval tuning target', () => {
    const question = generatePitchIntervalTuningQuestion()

    expect(isPitchIntervalTuningQuestion(question)).toBe(true)
    expect(question.referenceFrequency).toBeGreaterThan(0)
  })

  it('uses major third, perfect fourth, or perfect fifth targets', () => {
    const question = generatePitchIntervalTuningQuestion()
    const targetOffsets = pitchIntervalTuningTargets.map((target) => target.targetOffsetCents)

    expect(targetOffsets).toContain(question.targetOffsetCents)
    expect(question.targetLabel).toMatch(/above$/)
  })

  it('starts the adjustable pitch away from the target interval', () => {
    const question = generatePitchIntervalTuningQuestion()
    const startingError = Math.abs(question.initialOffsetCents - question.targetOffsetCents)

    expect(startingError).toBeGreaterThanOrEqual(50)
    expect(startingError).toBeLessThanOrEqual(400)
  })

  it('can repeatedly generate questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generatePitchIntervalTuningQuestion()
      }
    }).not.toThrow()
  })
})
