import { describe, expect, it } from 'vitest'
import { generatePitchDirectionQuestion } from './generatePitchDirectionQuestion'
import { CHROMATIC_MIDI_NOTES } from './music'

describe('generatePitchDirectionQuestion', () => {
  it('creates a starting note in range and caps the difference at one semitone', () => {
    const question = generatePitchDirectionQuestion()

    expect(CHROMATIC_MIDI_NOTES).toContain(question.firstNote)
    expect(question.centsDifference).toBeGreaterThanOrEqual(10)
    expect(question.centsDifference).toBeLessThanOrEqual(100)
  })

  it('creates exactly two direction options', () => {
    const question = generatePitchDirectionQuestion()

    expect(question.options.map((option) => option.direction)).toEqual(['higher', 'lower'])
  })

  it('marks higher as correct when the second note is higher', () => {
    const question = generatePitchDirectionQuestion(() => 0.4)

    expect(question.secondFrequency).toBeGreaterThan(question.firstFrequency)
    expect(question.options[question.correctOptionIndex]?.direction).toBe('higher')
  })

  it('marks lower as correct when the second note is lower', () => {
    const question = generatePitchDirectionQuestion(() => 0.9)

    expect(question.secondFrequency).toBeLessThan(question.firstFrequency)
    expect(question.options[question.correctOptionIndex]?.direction).toBe('lower')
  })

  it('honors the selected minimum difference', () => {
    const question = generatePitchDirectionQuestion(() => 0.3, 80)

    expect(question.centsDifference).toBeGreaterThanOrEqual(80)
    expect(question.centsDifference).toBeLessThanOrEqual(100)
  })

  it('honors a selected maximum difference below 50 cents', () => {
    const question = generatePitchDirectionQuestion(() => 0.8, 10, 40)

    expect(question.centsDifference).toBeGreaterThanOrEqual(10)
    expect(question.centsDifference).toBeLessThanOrEqual(40)
  })

  it('keeps the maximum at or below one semitone', () => {
    const question = generatePitchDirectionQuestion(() => 0.8, 90, 200)

    expect(question.centsDifference).toBeGreaterThanOrEqual(90)
    expect(question.centsDifference).toBeLessThanOrEqual(100)
  })

  it('can repeatedly generate questions without throwing', () => {
    expect(() => {
      for (let count = 0; count < 100; count += 1) {
        generatePitchDirectionQuestion()
      }
    }).not.toThrow()
  })
})
