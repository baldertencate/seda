import { DIATONIC_MIDI_NOTES } from './music'
import type { IntervalOption, IntervalQuestion, IntervalSize } from './types'

type RandomSource = () => number

const MINIMUM_OPTIONS = 3

export const INTERVAL_OPTIONS: IntervalOption[] = [
  { size: 'unison', label: 'Unison' },
  { size: 'second', label: 'Second' },
  { size: 'third', label: 'Third' },
  { size: 'fourth', label: 'Fourth' },
  { size: 'fifth', label: 'Fifth' },
  { size: 'sixth', label: 'Sixth' },
  { size: 'seventh', label: 'Seventh' },
  { size: 'octave', label: 'Octave' },
]

const INTERVAL_BY_STEPS: Record<number, IntervalOption> = Object.fromEntries(
  INTERVAL_OPTIONS.map((option, index) => [index, option]),
)

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

function optionKey(option: IntervalOption) {
  return option.size
}

function neighboringIntervalOptions(targetIndex: number, maxIntervalIndex = INTERVAL_OPTIONS.length - 1) {
  const candidates = [
    targetIndex - 2,
    targetIndex - 1,
    targetIndex + 1,
    targetIndex + 2,
    targetIndex - 3,
    targetIndex + 3,
  ]

  return candidates
    .filter((index) => index >= 0 && index <= maxIntervalIndex)
    .map((index) => INTERVAL_OPTIONS[index])
}

export function intervalOptionKey(option: IntervalOption) {
  return optionKey(option)
}

export function generateIntervalQuestion(random: RandomSource = Math.random): IntervalQuestion {
  const highestTonicIndex = DIATONIC_MIDI_NOTES.length - MINIMUM_OPTIONS
  const tonicIndex = randomInt(highestTonicIndex + 1, random)
  const availableIntervalCount = DIATONIC_MIDI_NOTES.length - tonicIndex
  const targetIndex = randomInt(availableIntervalCount, random)
  const target = INTERVAL_BY_STEPS[targetIndex]!
  const distractors = shuffle(neighboringIntervalOptions(targetIndex, availableIntervalCount - 1), random).slice(
    0,
    2,
  )
  const options = shuffle([target, ...distractors], random)
  const correctOptionIndex = options.findIndex((option) => option.size === target.size)

  return {
    id: crypto.randomUUID(),
    tonic: DIATONIC_MIDI_NOTES[tonicIndex],
    targetNote: DIATONIC_MIDI_NOTES[tonicIndex + targetIndex],
    target,
    options,
    correctOptionIndex,
  }
}

export function isIntervalSize(value: string): value is IntervalSize {
  return INTERVAL_OPTIONS.some((option) => option.size === value)
}
