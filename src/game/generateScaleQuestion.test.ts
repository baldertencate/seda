import { describe, expect, it } from 'vitest'
import {
  generateNamedScaleQuestion,
  generateScaleQuestion,
  namedScaleOptionKey,
} from './generateScaleQuestion'

describe('generateScaleQuestion', () => {
  it('creates a major or minor scale that goes up and back down', () => {
    const question = generateScaleQuestion()

    expect(question.scale).toHaveLength(15)
    expect(question.scale[0]).toBe(question.tonic)
    expect(question.scale[7]).toBe(question.tonic + 12)
    expect(question.scale.at(-1)).toBe(question.tonic)
    expect(
      question.scale.every((note, index, scale) => {
        if (index === 0) {
          return true
        }

        if (index <= 7) {
          return note > scale[index - 1]!
        }

        return note < scale[index - 1]!
      }),
    ).toBe(true)
  })

  it('creates major or minor as the only answer options', () => {
    const question = generateScaleQuestion()

    expect(question.options.map((option) => option.quality)).toEqual(['major', 'minor'])
    expect(question.options[question.correctOptionIndex]?.quality).toBe(question.target.quality)
  })

  it('maps major and minor to different scale patterns', () => {
    const major = generateScaleQuestion(() => 0)
    const minor = generateScaleQuestion(() => 0.9)

    expect(major.target.quality).toBe('major')
    expect(minor.target.quality).toBe('minor')
    expect(major.scale).not.toEqual(minor.scale)
  })

  it('can repeatedly generate scale questions without throwing', () => {
    expect(() => {
      for (let count = 0; count < 100; count += 1) {
        generateScaleQuestion()
      }
    }).not.toThrow()
  })

  it('creates a named scale that goes up and back down', () => {
    const question = generateNamedScaleQuestion()

    expect(question.scale).toHaveLength(15)
    expect(question.scale[0]).toBe(question.target.tonic)
    expect(question.scale[7]).toBe(question.target.tonic + 12)
    expect(question.scale.at(-1)).toBe(question.target.tonic)
    expect(
      question.scale.every((note, index, scale) => {
        if (index === 0) {
          return true
        }

        if (index <= 7) {
          return note > scale[index - 1]!
        }

        return note < scale[index - 1]!
      }),
    ).toBe(true)
  })

  it('creates four unique named scale answer options with one correct answer', () => {
    const question = generateNamedScaleQuestion()
    const optionKeys = question.options.map(namedScaleOptionKey)

    expect(question.options).toHaveLength(4)
    expect(new Set(optionKeys).size).toBe(4)
    expect(optionKeys.filter((key) => key === namedScaleOptionKey(question.target))).toHaveLength(1)
    expect(namedScaleOptionKey(question.options[question.correctOptionIndex]!)).toBe(
      namedScaleOptionKey(question.target),
    )
  })

  it('can generate major and minor named scale questions', () => {
    const major = generateNamedScaleQuestion(() => 0)
    const minor = generateNamedScaleQuestion(() => 0.9)

    expect(major.target.quality).toBe('major')
    expect(minor.target.quality).toBe('minor')
    expect(major.scale).not.toEqual(minor.scale)
  })
})
