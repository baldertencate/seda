import { describe, expect, it } from 'vitest'
import {
  generateRhythmQuestion,
  rhythmPhraseDuration,
  rhythmPhraseKey,
  rhythmPhrasesEqual,
} from './generateRhythmQuestion'

describe('generateRhythmQuestion', () => {
  it('creates one 4/4 bar for every option', () => {
    const question = generateRhythmQuestion()

    expect(rhythmPhraseDuration(question.target)).toBe(8)
    expect(question.options.every((option) => rhythmPhraseDuration(option) === 8)).toBe(true)
  })

  it('creates exactly three unique options', () => {
    const question = generateRhythmQuestion()
    const optionKeys = question.options.map(rhythmPhraseKey)

    expect(question.options).toHaveLength(3)
    expect(new Set(optionKeys).size).toBe(3)
  })

  it('has exactly one option equal to the played rhythm', () => {
    const question = generateRhythmQuestion()
    const matches = question.options.filter((option) => rhythmPhrasesEqual(option, question.target))

    expect(matches).toHaveLength(1)
    expect(rhythmPhrasesEqual(question.options[question.correctOptionIndex]!, question.target)).toBe(true)
  })

  it('includes rests in generated options', () => {
    const question = generateRhythmQuestion()

    expect(question.options.some((option) => option.some((event) => event.isRest))).toBe(true)
  })

  it('can repeatedly generate rhythm questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generateRhythmQuestion()
      }
    }).not.toThrow()
  })
})
