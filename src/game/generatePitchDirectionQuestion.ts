import { CHROMATIC_MIDI_NOTES } from './music'
import type { PitchDirectionOption, PitchDirectionQuestion } from './types'

type RandomSource = () => number

export const PITCH_DIRECTION_OPTIONS: PitchDirectionOption[] = [
  { direction: 'higher', label: 'Higher' },
  { direction: 'lower', label: 'Lower' },
]

function randomInt(max: number, random: RandomSource) {
  return Math.floor(random() * max)
}

function optionKey(option: PitchDirectionOption) {
  return option.direction
}

function frequencyForMidiNote(midiNote: number) {
  return 440 * 2 ** ((midiNote - 69) / 12)
}

export function pitchDirectionOptionKey(option: PitchDirectionOption) {
  return optionKey(option)
}

export function generatePitchDirectionQuestion(
  random: RandomSource = Math.random,
  minimumDifferenceCents = 50,
  maximumDifferenceCents = 100,
): PitchDirectionQuestion {
  const minimumCents = Math.min(Math.max(minimumDifferenceCents, 10), 100)
  const maximumCents = Math.min(Math.max(maximumDifferenceCents, minimumCents), 100)
  const firstNoteIndex = randomInt(CHROMATIC_MIDI_NOTES.length, random)
  const canGoLower = firstNoteIndex > 0
  const canGoHigher = firstNoteIndex < CHROMATIC_MIDI_NOTES.length - 1
  const direction = canGoHigher && (!canGoLower || random() < 0.5) ? 'higher' : 'lower'
  const firstNote = CHROMATIC_MIDI_NOTES[firstNoteIndex]
  const centsDifference =
    minimumCents === maximumCents
      ? minimumCents
      : minimumCents + Math.round((random() * (maximumCents - minimumCents)) / 5) * 5
  const signedCents = direction === 'higher' ? centsDifference : -centsDifference
  const firstFrequency = frequencyForMidiNote(firstNote)
  const secondFrequency = firstFrequency * 2 ** (signedCents / 1200)
  const target = PITCH_DIRECTION_OPTIONS.find((option) => option.direction === direction)!

  return {
    id: crypto.randomUUID(),
    firstNote,
    firstFrequency,
    secondFrequency,
    centsDifference,
    target,
    options: PITCH_DIRECTION_OPTIONS,
    correctOptionIndex: PITCH_DIRECTION_OPTIONS.findIndex(
      (option) => option.direction === direction,
    ),
  }
}
