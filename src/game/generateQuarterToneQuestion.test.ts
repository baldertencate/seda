import { describe, expect, it } from 'vitest'
import {
  generateQuarterToneQuestion,
  isQuarterToneMelody,
} from './generateQuarterToneQuestion'
import { quarterToneMelodiesEqual, quarterToneMelodyKey } from './music'

describe('generateQuarterToneQuestion', () => {
  it('creates four-note melodies in the permitted quarter-tone range', () => {
    const question = generateQuarterToneQuestion()

    expect(question.target).toHaveLength(4)
    expect(isQuarterToneMelody(question.target)).toBe(true)
    expect(question.options.every((melody) => melody.length === 4)).toBe(true)
    expect(question.options.every(isQuarterToneMelody)).toBe(true)
  })

  it('keeps the first note natural in every displayed option', () => {
    const question = generateQuarterToneQuestion()

    expect(question.target[0].cents).toBe(0)
    expect(question.options.every((melody) => melody[0].cents === 0)).toBe(true)
  })

  it('includes at least one koron or sori pitch in the target melody', () => {
    const question = generateQuarterToneQuestion()

    expect(question.target.some((pitch) => Math.abs(pitch.cents) === 50)).toBe(true)
  })

  it('includes at least one full sharp or flat among the answer choices', () => {
    const question = generateQuarterToneQuestion()

    expect(
      question.options.some((melody) => melody.some((pitch) => Math.abs(pitch.cents) === 100)),
    ).toBe(true)
  })

  it('creates exactly three unique sounding options', () => {
    const question = generateQuarterToneQuestion()
    const optionKeys = question.options.map(quarterToneMelodyKey)

    expect(question.options).toHaveLength(3)
    expect(new Set(optionKeys).size).toBe(3)
  })

  it('has exactly one option equal to the target melody', () => {
    const question = generateQuarterToneQuestion()
    const matchingOptions = question.options.filter((option) =>
      quarterToneMelodiesEqual(option, question.target),
    )

    expect(matchingOptions).toHaveLength(1)
    expect(quarterToneMelodiesEqual(question.options[question.correctOptionIndex]!, question.target)).toBe(
      true,
    )
  })

  it('creates distractors that differ from the target', () => {
    const question = generateQuarterToneQuestion()
    const distractors = question.options.filter(
      (option) => !quarterToneMelodiesEqual(option, question.target),
    )

    expect(distractors).toHaveLength(2)
  })

  it('can repeatedly generate questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generateQuarterToneQuestion()
      }
    }).not.toThrow()
  })
})
