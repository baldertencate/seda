import { DIATONIC_MIDI_NOTES, melodiesEqual, melodyKey, shiftDiatonic } from './music'
import type { Melody, Question } from './types'

type RandomSource = () => number

const MELODY_LENGTH = 4
const MAX_DISTRACTOR_ATTEMPTS = 80

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

export function generateMelody(random: RandomSource = Math.random): Melody {
  const melody: number[] = [randomFrom(DIATONIC_MIDI_NOTES, random)]

  while (melody.length < MELODY_LENGTH) {
    const previous = melody[melody.length - 1]!
    const previousIndex = DIATONIC_MIDI_NOTES.indexOf(previous as (typeof DIATONIC_MIDI_NOTES)[number])
    const candidateIndexes = [-2, -1, 0, 1, 2]
      .map((step) => previousIndex + step)
      .filter((index) => index >= 0 && index < DIATONIC_MIDI_NOTES.length)
    const nextIndex = randomFrom(candidateIndexes, random)
    melody.push(DIATONIC_MIDI_NOTES[nextIndex]!)
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
      const shifted = shiftDiatonic(melody[position], direction * distance)

      if (shifted === melody[position]) {
        melody[position] = shiftDiatonic(melody[position], direction * -distance)
      } else {
        melody[position] = shifted
      }
    }

    const key = melodyKey(melody)
    if (!usedKeys.has(key) && !melodiesEqual(melody, target)) {
      return melody
    }
  }

  return null
}

export function generateQuestion(random: RandomSource = Math.random): Question {
  const target = generateMelody(random)
  const usedKeys = new Set([melodyKey(target)])
  const distractors: Melody[] = []

  while (distractors.length < 2) {
    const distractor = createDistractor(target, usedKeys, random)

    if (!distractor) {
      throw new Error('Unable to generate unique melody options')
    }

    usedKeys.add(melodyKey(distractor))
    distractors.push(distractor)
  }

  const options = shuffle([target, ...distractors], random)
  const correctOptionIndex = options.findIndex((option) => melodiesEqual(option, target))

  return {
    id: crypto.randomUUID(),
    target,
    options,
    correctOptionIndex,
  }
}
