import { describe, expect, it } from 'vitest'
import { generatePitchMatchQuestion, isPitchMatchQuestion } from './generatePitchMatchQuestion'

describe('generatePitchMatchQuestion', () => {
  it('creates a valid reference note with a detuned starting pitch', () => {
    const question = generatePitchMatchQuestion()

    expect(isPitchMatchQuestion(question)).toBe(true)
    expect(question.referenceFrequency).toBeGreaterThan(0)
    expect(question.initialOffsetCents).not.toBe(0)
  })

  it('starts the adjustable pitch at least a quarter tone away', () => {
    const question = generatePitchMatchQuestion()

    expect(Math.abs(question.initialOffsetCents)).toBeGreaterThanOrEqual(50)
  })

  it('keeps the initial pitch within two whole tones above or below', () => {
    const question = generatePitchMatchQuestion()

    expect(Math.abs(question.initialOffsetCents)).toBeLessThanOrEqual(400)
  })

  it('can repeatedly generate questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generatePitchMatchQuestion()
      }
    }).not.toThrow()
  })
})
