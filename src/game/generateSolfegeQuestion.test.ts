import { describe, expect, it } from 'vitest'
import {
  CHROMATIC_SOLFEGE_OPTIONS,
  generateChromaticSolfegeQuestion,
  generateSolfegeQuestion,
  SOLFEGE_OPTIONS,
} from './generateSolfegeQuestion'

describe('generateSolfegeQuestion', () => {
  it('creates a named reference and target note', () => {
    const question = generateSolfegeQuestion()

    expect(SOLFEGE_OPTIONS).toContain(question.reference)
    expect(SOLFEGE_OPTIONS).toContain(question.target)
  })

  it('creates exactly five unique solfege options', () => {
    const question = generateSolfegeQuestion()
    const optionNames = question.options.map((option) => option.name)

    expect(question.options).toHaveLength(5)
    expect(new Set(optionNames).size).toBe(5)
  })

  it('has exactly one option equal to the target note name', () => {
    const question = generateSolfegeQuestion()
    const matches = question.options.filter((option) => option.name === question.target.name)

    expect(matches).toHaveLength(1)
    expect(question.options[question.correctOptionIndex]?.name).toBe(question.target.name)
  })

  it('can repeatedly generate questions without throwing', () => {
    expect(() => {
      for (let count = 0; count < 100; count += 1) {
        generateSolfegeQuestion()
      }
    }).not.toThrow()
  })
})

describe('generateChromaticSolfegeQuestion', () => {
  it('creates a natural reference and chromatic target note', () => {
    const question = generateChromaticSolfegeQuestion()

    expect(SOLFEGE_OPTIONS).toContain(question.reference)
    expect(CHROMATIC_SOLFEGE_OPTIONS).toContain(question.target)
  })

  it('creates exactly six unique options', () => {
    const question = generateChromaticSolfegeQuestion()
    const optionNames = question.options.map((option) => option.name)

    expect(question.options).toHaveLength(6)
    expect(new Set(optionNames).size).toBe(6)
  })

  it('includes at least one sharp or flat option', () => {
    const question = generateChromaticSolfegeQuestion()

    expect(question.options.some((option) => /#|b/.test(option.label))).toBe(true)
  })

  it('uses solfege names for sharp and flat options', () => {
    const labels = CHROMATIC_SOLFEGE_OPTIONS.map((option) => option.label)

    expect(labels).toContain('Mib')
    expect(labels).toContain('Lab')
    expect(labels).toContain('Tib')
    expect(labels).not.toContain('Eb')
    expect(labels).not.toContain('Ab')
    expect(labels).not.toContain('Bb')
  })

  it('has exactly one option equal to the chromatic target note name', () => {
    const question = generateChromaticSolfegeQuestion()
    const matches = question.options.filter((option) => option.name === question.target.name)

    expect(matches).toHaveLength(1)
    expect(question.options[question.correctOptionIndex]?.name).toBe(question.target.name)
  })

  it('can repeatedly generate chromatic solfege questions without throwing', () => {
    expect(() => {
      for (let count = 0; count < 100; count += 1) {
        generateChromaticSolfegeQuestion()
      }
    }).not.toThrow()
  })
})
