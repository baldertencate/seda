import { describe, expect, it } from 'vitest'
import { generateChromaticQuestion, isChromaticMelody } from './generateChromaticQuestion'
import { melodiesEqual, melodyAccidentals, melodyKey, melodySoundKey } from './music'

describe('generateChromaticQuestion', () => {
  it('creates four-note chromatic melodies in range', () => {
    const question = generateChromaticQuestion()

    expect(question.target).toHaveLength(4)
    expect(isChromaticMelody(question.target)).toBe(true)
    expect(question.options.every((option) => option.length === 4)).toBe(true)
    expect(question.options.every(isChromaticMelody)).toBe(true)
  })

  it('creates exactly three unique options', () => {
    const question = generateChromaticQuestion()
    const optionKeys = question.options.map(melodyKey)

    expect(question.options).toHaveLength(3)
    expect(new Set(optionKeys).size).toBe(3)
  })

  it('creates exactly three unique sounding options', () => {
    const question = generateChromaticQuestion()
    const optionSoundKeys = question.options.map(melodySoundKey)

    expect(new Set(optionSoundKeys).size).toBe(3)
  })

  it('has exactly one option equal to the target melody', () => {
    const question = generateChromaticQuestion()
    const matchingOptions = question.options.filter((option) => melodiesEqual(option, question.target))

    expect(matchingOptions).toHaveLength(1)
    expect(melodiesEqual(question.options[question.correctOptionIndex]!, question.target)).toBe(true)
  })

  it('creates distractors that differ from the target', () => {
    const question = generateChromaticQuestion()
    const distractors = question.options.filter((option) => !melodiesEqual(option, question.target))

    expect(distractors).toHaveLength(2)
  })

  it('uses one accidental spelling mode per question', () => {
    const question = generateChromaticQuestion()

    expect(['sharps', 'flats']).toContain(question.accidentalMode)

    for (const option of question.options) {
      const accidentals = melodyAccidentals(option, question.accidentalMode)

      if (question.accidentalMode === 'sharps') {
        expect(accidentals).not.toContain('b')
      } else {
        expect(accidentals).not.toContain('#')
      }
    }
  })

  it('does not create enharmonic duplicate answers', () => {
    for (let index = 0; index < 200; index += 1) {
      const question = generateChromaticQuestion()
      const optionSoundKeys = question.options.map(melodySoundKey)

      expect(new Set(optionSoundKeys).size).toBe(question.options.length)
      expect(optionSoundKeys.filter((key) => key === melodySoundKey(question.target))).toHaveLength(1)
    }
  })

  it('can repeatedly generate chromatic questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generateChromaticQuestion()
      }
    }).not.toThrow()
  })
})
