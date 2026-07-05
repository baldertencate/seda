import type { SolfegeOption, SolfegeQuestion } from './types'

type RandomSource = () => number

export const SOLFEGE_OPTIONS: SolfegeOption[] = [
  { midiNote: 60, name: 'do', label: 'Do' },
  { midiNote: 62, name: 're', label: 'Re' },
  { midiNote: 64, name: 'mi', label: 'Mi' },
  { midiNote: 65, name: 'fa', label: 'Fa' },
  { midiNote: 67, name: 'sol', label: 'Sol' },
  { midiNote: 69, name: 'la', label: 'La' },
  { midiNote: 71, name: 'ti', label: 'Ti' },
]

export const CHROMATIC_SOLFEGE_OPTIONS: SolfegeOption[] = [
  { midiNote: 60, name: 'do', label: 'Do' },
  { midiNote: 61, name: 'do-sharp', label: 'Do#' },
  { midiNote: 62, name: 're', label: 'Re' },
  { midiNote: 63, name: 'mi-flat', label: 'Mib' },
  { midiNote: 64, name: 'mi', label: 'Mi' },
  { midiNote: 65, name: 'fa', label: 'Fa' },
  { midiNote: 66, name: 'fa-sharp', label: 'Fa#' },
  { midiNote: 67, name: 'sol', label: 'Sol' },
  { midiNote: 68, name: 'la-flat', label: 'Lab' },
  { midiNote: 69, name: 'la', label: 'La' },
  { midiNote: 70, name: 'ti-flat', label: 'Tib' },
  { midiNote: 71, name: 'ti', label: 'Ti' },
]

function randomInt(max: number, random: RandomSource) {
  return Math.floor(random() * max)
}

function shuffle<T>(items: T[], random: RandomSource) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1, random)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!]
  }

  return shuffled
}

export function solfegeOptionKey(option: SolfegeOption) {
  return option.name
}

export function generateSolfegeQuestion(random: RandomSource = Math.random): SolfegeQuestion {
  const reference = SOLFEGE_OPTIONS[randomInt(SOLFEGE_OPTIONS.length, random)]!
  const target = SOLFEGE_OPTIONS[randomInt(SOLFEGE_OPTIONS.length, random)]!
  const distractors = shuffle(
    SOLFEGE_OPTIONS.filter((option) => option.name !== target.name),
    random,
  ).slice(0, 4)
  const options = shuffle([target, ...distractors], random)

  return {
    id: crypto.randomUUID(),
    reference,
    target,
    options,
    correctOptionIndex: options.findIndex((option) => option.name === target.name),
  }
}

function isAccidentalOption(option: SolfegeOption) {
  return option.label.includes('#') || option.label.includes('b')
}

export function generateChromaticSolfegeQuestion(
  random: RandomSource = Math.random,
): SolfegeQuestion {
  const reference = SOLFEGE_OPTIONS[randomInt(SOLFEGE_OPTIONS.length, random)]!
  const target = CHROMATIC_SOLFEGE_OPTIONS[randomInt(CHROMATIC_SOLFEGE_OPTIONS.length, random)]!
  const usedNames = new Set([target.name])
  const distractors: SolfegeOption[] = []
  const candidates = shuffle(
    CHROMATIC_SOLFEGE_OPTIONS.filter((option) => option.name !== target.name),
    random,
  )

  if (!isAccidentalOption(target)) {
    const accidental = shuffle(CHROMATIC_SOLFEGE_OPTIONS.filter(isAccidentalOption), random)[0]!
    distractors.push(accidental)
    usedNames.add(accidental.name)
  }

  for (const option of candidates) {
    if (distractors.length >= 5) {
      break
    }

    if (usedNames.has(option.name)) {
      continue
    }

    usedNames.add(option.name)
    distractors.push(option)
  }

  const options = shuffle([target, ...distractors], random)

  return {
    id: crypto.randomUUID(),
    reference,
    target,
    options,
    correctOptionIndex: options.findIndex((option) => option.name === target.name),
  }
}
