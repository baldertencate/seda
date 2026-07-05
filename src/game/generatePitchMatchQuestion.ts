import { DIATONIC_MIDI_NOTES } from './music'
import type { PitchMatchQuestion } from './types'

type RandomSource = () => number

const MIN_OFFSET_CENTS = 50
const MAX_OFFSET_CENTS = 400

function randomInt(max: number, random: RandomSource) {
  return Math.floor(random() * max)
}

function frequencyForMidiNote(midiNote: number) {
  return 440 * 2 ** ((midiNote - 69) / 12)
}

function randomInitialOffset(random: RandomSource) {
  const direction = random() < 0.5 ? -1 : 1
  const magnitude = MIN_OFFSET_CENTS + randomInt(MAX_OFFSET_CENTS - MIN_OFFSET_CENTS + 1, random)

  return direction * magnitude
}

export function generatePitchMatchQuestion(random: RandomSource = Math.random): PitchMatchQuestion {
  const referenceMidiNote = DIATONIC_MIDI_NOTES[randomInt(DIATONIC_MIDI_NOTES.length, random)]

  return {
    id: crypto.randomUUID(),
    referenceMidiNote,
    referenceFrequency: frequencyForMidiNote(referenceMidiNote),
    initialOffsetCents: randomInitialOffset(random),
    targetOffsetCents: 0,
    targetLabel: 'same pitch',
  }
}

export function isPitchMatchQuestion(question: PitchMatchQuestion) {
  return (
    DIATONIC_MIDI_NOTES.includes(
      question.referenceMidiNote as (typeof DIATONIC_MIDI_NOTES)[number],
    ) &&
    Math.abs(question.initialOffsetCents) >= MIN_OFFSET_CENTS &&
    Math.abs(question.initialOffsetCents) <= MAX_OFFSET_CENTS &&
    question.targetOffsetCents === 0
  )
}
