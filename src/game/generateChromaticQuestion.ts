import {
  CHROMATIC_MIDI_NOTES,
  isAllowedChromaticMidiNote,
  melodiesEqual,
  melodySoundKey,
} from './music'
import type { AccidentalMode, Melody, Question } from './types'

type RandomSource = () => number

const MELODY_LENGTH = 4
const MAX_DISTRACTOR_ATTEMPTS = 100

export type ChromaticQuestion = Question & {
  accidentalMode: Exclude<AccidentalMode, 'mixed'>
}

function randomInt(max: number, random: RandomSource) {
  return Math.floor(random() * max)
}

function randomFrom<T>(items: readonly T[], random: RandomSource) {
  return items[randomInt(items.length, random)]!
}

function shuffle<T>(items: T[], random: RandomSource) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1, random)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!]
  }

  return shuffled
}

function clampToChromaticRange(note: number) {
  return Math.min(Math.max(note, CHROMATIC_MIDI_NOTES[0]), CHROMATIC_MIDI_NOTES[CHROMATIC_MIDI_NOTES.length - 1])
}

function generateChromaticMelody(random: RandomSource): Melody {
  const melody: number[] = [randomFrom(CHROMATIC_MIDI_NOTES, random)]

  while (melody.length < MELODY_LENGTH) {
    const previous = melody[melody.length - 1]!
    const step = randomFrom([-2, -1, 0, 1, 2], random)
    melody.push(clampToChromaticRange(previous + step))
  }

  return melody as Melody
}

function createDistractor(target: Melody, usedKeys: Set<string>, random: RandomSource): Melody | null {
  for (let attempt = 0; attempt < MAX_DISTRACTOR_ATTEMPTS; attempt += 1) {
    const changedPositions = new Set<number>()
    const changes = randomFrom([1, 2], random)
    const melody = [...target] as Melody

    while (changedPositions.size < changes) {
      changedPositions.add(randomInt(MELODY_LENGTH, random))
    }

    for (const position of changedPositions) {
      const direction = randomFrom([-1, 1], random)
      const distance = randomFrom([1, 2], random)
      const shifted = clampToChromaticRange(melody[position] + direction * distance)

      melody[position] =
        shifted === melody[position]
          ? clampToChromaticRange(melody[position] - direction * distance)
          : shifted
    }

    const key = melodySoundKey(melody)
    if (!usedKeys.has(key) && !melodiesEqual(melody, target)) {
      return melody
    }
  }

  return null
}

export function generateChromaticQuestion(random: RandomSource = Math.random): ChromaticQuestion {
  const accidentalMode = randomFrom(['sharps', 'flats'] as const, random)
  const target = generateChromaticMelody(random)
  const usedKeys = new Set([melodySoundKey(target)])
  const distractors: Melody[] = []

  while (distractors.length < 2) {
    const distractor = createDistractor(target, usedKeys, random)

    if (!distractor) {
      throw new Error('Unable to generate unique chromatic melody options')
    }

    usedKeys.add(melodySoundKey(distractor))
    distractors.push(distractor)
  }

  const options = shuffle([target, ...distractors], random)
  const optionSoundKeys = new Set(options.map(melodySoundKey))
  if (optionSoundKeys.size !== options.length) {
    throw new Error('Chromatic options must be unique by sounding pitch')
  }

  const correctOptionIndex = options.findIndex((option) => melodiesEqual(option, target))

  return {
    id: crypto.randomUUID(),
    target,
    options,
    correctOptionIndex,
    accidentalMode,
  }
}

export function isChromaticMelody(melody: Melody) {
  return melody.every(isAllowedChromaticMidiNote)
}
