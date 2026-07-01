import type { RhythmDuration, RhythmEvent, RhythmPhrase, RhythmQuestion } from './types'

type RandomSource = () => number

const focusPitch = 60

const RHYTHM_PATTERNS: readonly RhythmPhrase[] = [
  phrase([
    [2, false],
    [2, false],
    [2, true],
    [2, false],
  ]),
  phrase([
    [2, false],
    [1, false],
    [1, false],
    [2, true],
    [2, false],
  ]),
  phrase([
    [1, false],
    [1, false],
    [2, false],
    [2, true],
    [2, false],
  ]),
  phrase([
    [2, false],
    [2, true],
    [1, false],
    [1, false],
    [2, false],
  ]),
  phrase([
    [4, false],
    [2, true],
    [2, false],
  ]),
  phrase([
    [2, true],
    [2, false],
    [2, false],
    [2, false],
  ]),
  phrase([
    [1, false],
    [1, true],
    [2, false],
    [2, false],
    [2, false],
  ]),
  phrase([
    [2, false],
    [1, true],
    [1, false],
    [4, false],
  ]),
  phrase([
    [1, false],
    [1, false],
    [1, true],
    [1, false],
    [2, false],
    [2, true],
  ]),
  phrase([
    [2, false],
    [2, false],
    [1, false],
    [1, true],
    [2, false],
  ]),
]

function phrase(events: Array<[RhythmDuration, boolean]>): RhythmPhrase {
  return events.map(([duration, isRest]) => ({
    duration,
    isRest,
    midiNote: focusPitch,
  }))
}

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

export function rhythmPhraseKey(phraseToKey: RhythmPhrase) {
  return phraseToKey
    .map((event) => `${event.isRest ? 'r' : 'n'}${event.duration}`)
    .join('-')
}

export function rhythmPhraseDuration(phraseToMeasure: RhythmPhrase) {
  return phraseToMeasure.reduce((total, event) => total + event.duration, 0)
}

export function rhythmPhrasesEqual(left: RhythmPhrase, right: RhythmPhrase) {
  return rhythmPhraseKey(left) === rhythmPhraseKey(right)
}

function eventDistance(left: RhythmEvent | undefined, right: RhythmEvent | undefined) {
  if (!left || !right) {
    return 3
  }

  return Math.abs(left.duration - right.duration) + (left.isRest === right.isRest ? 0 : 1)
}

function phraseDistance(left: RhythmPhrase, right: RhythmPhrase) {
  const length = Math.max(left.length, right.length)
  let distance = 0

  for (let index = 0; index < length; index += 1) {
    distance += eventDistance(left[index], right[index])
  }

  return distance
}

export function generateRhythmQuestion(random: RandomSource = Math.random): RhythmQuestion {
  const target = RHYTHM_PATTERNS[randomInt(RHYTHM_PATTERNS.length, random)]!
  const targetKey = rhythmPhraseKey(target)
  const distractors = RHYTHM_PATTERNS.filter((pattern) => rhythmPhraseKey(pattern) !== targetKey)
    .sort((left, right) => phraseDistance(left, target) - phraseDistance(right, target))
    .slice(0, 4)

  const selectedDistractors = shuffle(distractors, random).slice(0, 2)
  const options = shuffle([target, ...selectedDistractors], random)
  const correctOptionIndex = options.findIndex((option) => rhythmPhrasesEqual(option, target))

  return {
    id: crypto.randomUUID(),
    target,
    options,
    correctOptionIndex,
  }
}
