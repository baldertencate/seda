import { melodyKey } from './music'
import { generateMelody } from './generateQuestion'
import type { OrnamentKind, OrnamentPlacement, OrnamentQuestion, OrnamentedMelody } from './types'

type RandomSource = () => number

export const ORNAMENT_KINDS: readonly OrnamentKind[] = [
  'mordent',
  'mordentInverted',
  'turn',
  'turnInverted',
]

const ORNAMENT_LABELS: Record<OrnamentKind, string> = {
  mordent: 'upper mordent',
  mordentInverted: 'lower mordent',
  turn: 'grupetto',
  turnInverted: 'inverted grupetto',
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

export function ornamentPlacementKey(placement: OrnamentPlacement) {
  return `${placement.noteIndex}:${placement.kind}`
}

export function ornamentedMelodyKey(option: OrnamentedMelody) {
  return `${melodyKey(option.melody)}:${ornamentPlacementKey(option.ornament)}`
}

export function getOrnamentLabel(kind: OrnamentKind) {
  return ORNAMENT_LABELS[kind]
}

export function generateOrnamentQuestion(random: RandomSource = Math.random): OrnamentQuestion {
  const melody = generateMelody(random)
  const target: OrnamentedMelody = {
    melody,
    ornament: {
      noteIndex: randomInt(melody.length, random),
      kind: randomFrom(ORNAMENT_KINDS, random),
    },
  }

  const usedKeys = new Set([ornamentedMelodyKey(target)])
  const options: OrnamentedMelody[] = [target]

  while (options.length < 3) {
    const shouldMoveOrnament = random() < 0.55
    const nextOption: OrnamentedMelody = {
      melody,
      ornament: {
        noteIndex: shouldMoveOrnament ? randomInt(melody.length, random) : target.ornament.noteIndex,
        kind: shouldMoveOrnament ? target.ornament.kind : randomFrom(ORNAMENT_KINDS, random),
      },
    }

    const key = ornamentedMelodyKey(nextOption)
    if (!usedKeys.has(key)) {
      usedKeys.add(key)
      options.push(nextOption)
    }
  }

  const shuffledOptions = shuffle(options, random)
  const correctOptionIndex = shuffledOptions.findIndex(
    (option) => ornamentedMelodyKey(option) === ornamentedMelodyKey(target),
  )

  return {
    id: crypto.randomUUID(),
    target,
    options: shuffledOptions,
    correctOptionIndex,
  }
}
