import { describe, expect, it } from 'vitest'
import { generateQuestion } from './generateQuestion'
import { isAllowedMidiNote, melodiesEqual, melodyKey } from './music'

describe('generateQuestion', () => {
  it('creates four-note melodies in the permitted range', () => {
    const question = generateQuestion()

    expect(question.target).toHaveLength(4)
    expect(question.target.every(isAllowedMidiNote)).toBe(true)
    expect(question.options.every((melody) => melody.length === 4)).toBe(true)
    expect(question.options.flat().every(isAllowedMidiNote)).toBe(true)
  })

  it('creates exactly three unique options', () => {
    const question = generateQuestion()
    const optionKeys = question.options.map(melodyKey)

    expect(question.options).toHaveLength(3)
    expect(new Set(optionKeys).size).toBe(3)
  })

  it('has exactly one option equal to the target melody', () => {
    const question = generateQuestion()
    const matchingOptions = question.options.filter((option) => melodiesEqual(option, question.target))

    expect(matchingOptions).toHaveLength(1)
    expect(melodiesEqual(question.options[question.correctOptionIndex]!, question.target)).toBe(true)
  })

  it('creates distractors that differ from the target', () => {
    const question = generateQuestion()
    const distractors = question.options.filter((option) => !melodiesEqual(option, question.target))

    expect(distractors).toHaveLength(2)
  })

  it('can repeatedly generate questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generateQuestion()
      }
    }).not.toThrow()
  })
})
