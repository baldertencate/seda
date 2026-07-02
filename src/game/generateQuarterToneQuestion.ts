import {
  DIATONIC_MIDI_NOTES,
  quarterToneMelodiesEqual,
  quarterToneMelodyKey,
} from './music'
import type { QuarterToneMelody, QuarterToneOffset, QuarterTonePitch } from './types'

type RandomSource = () => number

const MELODY_LENGTH = 4
const MAX_DISTRACTOR_ATTEMPTS = 100
const ALTERED_OFFSETS = [-100, -50, 0, 50, 100] as const
const FIRST_NOTE_OFFSETS = [0] as const
const DISTRACTOR_POSITIONS = [1, 2, 3] as const

export type QuarterToneQuestion = {
  id: string
  target: QuarterToneMelody
  options: QuarterToneMelody[]
  correctOptionIndex: number
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

function clampDiatonicIndex(index: number) {
  return Math.min(Math.max(index, 0), DIATONIC_MIDI_NOTES.length - 1)
}

function randomQuarterTonePitch(
  midi: number,
  offsets: readonly QuarterToneOffset[],
  random: RandomSource,
): QuarterTonePitch {
  return {
    midi,
    cents: randomFrom(offsets, random),
  }
}

function generateQuarterToneMelody(random: RandomSource): QuarterToneMelody {
  let melody: QuarterTonePitch[] = []

  do {
    melody = []
    let diatonicIndex = randomInt(DIATONIC_MIDI_NOTES.length, random)

    while (melody.length < MELODY_LENGTH) {
      const offsets = melody.length === 0 ? FIRST_NOTE_OFFSETS : ALTERED_OFFSETS
      melody.push(randomQuarterTonePitch(DIATONIC_MIDI_NOTES[diatonicIndex], offsets, random))

      const step = randomFrom([-2, -1, 0, 1, 2], random)
      diatonicIndex = clampDiatonicIndex(diatonicIndex + step)
    }
  } while (!hasQuarterToneAccidental(melody as QuarterToneMelody))

  return melody as QuarterToneMelody
}

function hasQuarterToneAccidental(melody: QuarterToneMelody) {
  return melody.some((pitch) => Math.abs(pitch.cents) === 50)
}

function hasFullAccidental(melody: QuarterToneMelody) {
  return melody.some((pitch) => Math.abs(pitch.cents) === 100)
}

function shiftPitch(pitch: QuarterTonePitch, diatonicSteps: number, cents: QuarterToneOffset) {
  const currentIndex = DIATONIC_MIDI_NOTES.indexOf(
    pitch.midi as (typeof DIATONIC_MIDI_NOTES)[number],
  )

  return {
    midi: DIATONIC_MIDI_NOTES[clampDiatonicIndex(currentIndex + diatonicSteps)],
    cents,
  }
}

function createDistractor(
  target: QuarterToneMelody,
  usedKeys: Set<string>,
  random: RandomSource,
): QuarterToneMelody | null {
  for (let attempt = 0; attempt < MAX_DISTRACTOR_ATTEMPTS; attempt += 1) {
    const changedPositions = new Set<number>()
    const changes = randomFrom([1, 2], random)
    const melody = target.map((pitch) => ({ ...pitch })) as QuarterToneMelody

    while (changedPositions.size < changes) {
      changedPositions.add(randomFrom(DISTRACTOR_POSITIONS, random))
    }

    for (const position of changedPositions) {
      const pitch = melody[position]
      const keepStaffPitch = random() < 0.65
      const nextCents = randomFrom(
        ALTERED_OFFSETS.filter((offset) => offset !== pitch.cents),
        random,
      )
      const diatonicSteps = keepStaffPitch ? 0 : randomFrom([-1, 1], random)

      melody[position] = shiftPitch(pitch, diatonicSteps, nextCents)
    }

    const key = quarterToneMelodyKey(melody)
    if (!usedKeys.has(key) && !quarterToneMelodiesEqual(melody, target)) {
      return melody
    }
  }

  return null
}

function createFullAccidentalDistractor(
  target: QuarterToneMelody,
  usedKeys: Set<string>,
): QuarterToneMelody | null {
  for (const position of DISTRACTOR_POSITIONS) {
    for (const cents of [-100, 100] as const) {
      if (target[position].cents === cents) {
        continue
      }

      const melody = target.map((pitch) => ({ ...pitch })) as QuarterToneMelody
      melody[position] = {
        ...melody[position],
        cents,
      }

      if (!usedKeys.has(quarterToneMelodyKey(melody))) {
        return melody
      }
    }
  }

  return null
}

export function generateQuarterToneQuestion(random: RandomSource = Math.random): QuarterToneQuestion {
  const target = generateQuarterToneMelody(random)
  const usedKeys = new Set([quarterToneMelodyKey(target)])
  const distractors: QuarterToneMelody[] = []

  while (distractors.length < 2) {
    const distractor = createDistractor(target, usedKeys, random)

    if (!distractor) {
      throw new Error('Unable to generate unique quarter-tone melody options')
    }

    usedKeys.add(quarterToneMelodyKey(distractor))
    distractors.push(distractor)
  }

  if (![target, ...distractors].some(hasFullAccidental)) {
    const fullAccidentalDistractor = createFullAccidentalDistractor(target, usedKeys)

    if (!fullAccidentalDistractor) {
      throw new Error('Unable to generate a full-accidental quarter-tone option')
    }

    distractors[distractors.length - 1] = fullAccidentalDistractor
  }

  const options = shuffle([target, ...distractors], random)
  const optionKeys = new Set(options.map(quarterToneMelodyKey))
  if (optionKeys.size !== options.length) {
    throw new Error('Quarter-tone options must be unique by sounding pitch')
  }

  const correctOptionIndex = options.findIndex((option) => quarterToneMelodiesEqual(option, target))

  return {
    id: crypto.randomUUID(),
    target,
    options,
    correctOptionIndex,
  }
}

export function isQuarterToneMelody(melody: QuarterToneMelody) {
  return melody.every((pitch) => {
    return (
      DIATONIC_MIDI_NOTES.includes(pitch.midi as (typeof DIATONIC_MIDI_NOTES)[number]) &&
      ALTERED_OFFSETS.includes(pitch.cents)
    )
  })
}
