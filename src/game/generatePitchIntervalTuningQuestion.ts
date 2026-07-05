import { DIATONIC_MIDI_NOTES } from './music'
import type { PitchMatchQuestion } from './types'

type RandomSource = () => number

const MIN_ERROR_CENTS = 50
const MAX_ERROR_CENTS = 400

export const pitchIntervalTuningTargets = [
  { targetOffsetCents: 400, targetLabel: 'major third above' },
  { targetOffsetCents: 500, targetLabel: 'perfect fourth above' },
  { targetOffsetCents: 700, targetLabel: 'perfect fifth above' },
] as const

function randomInt(max: number, random: RandomSource) {
  return Math.floor(random() * max)
}

function frequencyForMidiNote(midiNote: number) {
  return 440 * 2 ** ((midiNote - 69) / 12)
}

function randomStartingError(random: RandomSource) {
  const direction = random() < 0.5 ? -1 : 1
  const magnitude = MIN_ERROR_CENTS + randomInt(MAX_ERROR_CENTS - MIN_ERROR_CENTS + 1, random)

  return direction * magnitude
}

export function generatePitchIntervalTuningQuestion(
  random: RandomSource = Math.random,
): PitchMatchQuestion {
  const referenceMidiNote = DIATONIC_MIDI_NOTES[randomInt(DIATONIC_MIDI_NOTES.length, random)]
  const target = pitchIntervalTuningTargets[
    randomInt(pitchIntervalTuningTargets.length, random)
  ]

  return {
    id: crypto.randomUUID(),
    referenceMidiNote,
    referenceFrequency: frequencyForMidiNote(referenceMidiNote),
    initialOffsetCents: target.targetOffsetCents + randomStartingError(random),
    targetOffsetCents: target.targetOffsetCents,
    targetLabel: target.targetLabel,
  }
}

export function isPitchIntervalTuningQuestion(question: PitchMatchQuestion) {
  return (
    DIATONIC_MIDI_NOTES.includes(
      question.referenceMidiNote as (typeof DIATONIC_MIDI_NOTES)[number],
    ) &&
    pitchIntervalTuningTargets.some(
      (target) =>
        target.targetOffsetCents === question.targetOffsetCents &&
        target.targetLabel === question.targetLabel,
    ) &&
    Math.abs(question.initialOffsetCents - question.targetOffsetCents) >= MIN_ERROR_CENTS &&
    Math.abs(question.initialOffsetCents - question.targetOffsetCents) <= MAX_ERROR_CENTS
  )
}
