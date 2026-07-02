import { describe, expect, it } from 'vitest'
import {
  generateIntervalQuestion,
  INTERVAL_OPTIONS,
  intervalOptionKey,
  isIntervalSize,
} from './generateIntervalQuestion'
import { DIATONIC_MIDI_NOTES } from './music'

describe('generateIntervalQuestion', () => {
  it('creates a tonic-to-natural-note interval in the permitted range', () => {
    const question = generateIntervalQuestion()

    expect(DIATONIC_MIDI_NOTES.includes(question.tonic as never)).toBe(true)
    expect(DIATONIC_MIDI_NOTES.includes(question.targetNote as never)).toBe(true)
    expect(question.targetNote).toBeGreaterThanOrEqual(question.tonic)
    expect(isIntervalSize(question.target.size)).toBe(true)
  })

  it('varies the tonic across generated questions', () => {
    const tonics = new Set(
      Array.from({ length: 100 }, () => generateIntervalQuestion().tonic),
    )

    expect(tonics.size).toBeGreaterThan(1)
  })

  it('creates exactly three unique interval options', () => {
    const question = generateIntervalQuestion()
    const optionKeys = question.options.map(intervalOptionKey)

    expect(question.options).toHaveLength(3)
    expect(new Set(optionKeys).size).toBe(3)
  })

  it('has exactly one option equal to the target interval', () => {
    const question = generateIntervalQuestion()
    const matchingOptions = question.options.filter((option) => option.size === question.target.size)

    expect(matchingOptions).toHaveLength(1)
    expect(question.options[question.correctOptionIndex]!.size).toBe(question.target.size)
  })

  it('creates distractors that differ from the target', () => {
    const question = generateIntervalQuestion()
    const distractors = question.options.filter((option) => option.size !== question.target.size)

    expect(distractors).toHaveLength(2)
  })

  it('maps every interval target to the matching diatonic note', () => {
    INTERVAL_OPTIONS.forEach((interval, index) => {
      const values = [0, index / INTERVAL_OPTIONS.length]
      const question = generateIntervalQuestion(() => values.shift() ?? 0)

      expect(question.target.size).toBe(interval.size)
      expect(question.targetNote).toBe(DIATONIC_MIDI_NOTES[index])
    })
  })

  it('only offers interval options that fit above the selected tonic', () => {
    const question = generateIntervalQuestion(() => 0.999)
    const tonicIndex = DIATONIC_MIDI_NOTES.indexOf(
      question.tonic as (typeof DIATONIC_MIDI_NOTES)[number],
    )
    const highestOptionIndex = DIATONIC_MIDI_NOTES.length - tonicIndex - 1

    expect(
      question.options.every((option) => {
        const optionIndex = INTERVAL_OPTIONS.findIndex((candidate) => candidate.size === option.size)
        return optionIndex <= highestOptionIndex
      }),
    ).toBe(true)
  })

  it('can repeatedly generate questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generateIntervalQuestion()
      }
    }).not.toThrow()
  })
})
