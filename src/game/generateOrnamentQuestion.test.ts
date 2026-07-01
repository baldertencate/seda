import { describe, expect, it } from 'vitest'
import { generateOrnamentQuestion, ornamentedMelodyKey } from './generateOrnamentQuestion'
import { isAllowedMidiNote, melodiesEqual } from './music'

describe('generateOrnamentQuestion', () => {
  it('uses one four-note melody for all options', () => {
    const question = generateOrnamentQuestion()

    expect(question.target.melody).toHaveLength(4)
    expect(question.target.melody.every(isAllowedMidiNote)).toBe(true)
    expect(question.options).toHaveLength(3)
    expect(question.options.every((option) => melodiesEqual(option.melody, question.target.melody))).toBe(
      true,
    )
  })

  it('creates three unique ornament choices with exactly one target match', () => {
    const question = generateOrnamentQuestion()
    const optionKeys = question.options.map(ornamentedMelodyKey)
    const targetKey = ornamentedMelodyKey(question.target)

    expect(new Set(optionKeys).size).toBe(3)
    expect(optionKeys.filter((key) => key === targetKey)).toHaveLength(1)
    expect(optionKeys[question.correctOptionIndex]).toBe(targetKey)
  })

  it('can repeatedly generate ornament questions without throwing', () => {
    expect(() => {
      for (let index = 0; index < 200; index += 1) {
        generateOrnamentQuestion()
      }
    }).not.toThrow()
  })
})
