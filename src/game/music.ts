import type { AccidentalMode, Melody } from './types'

export const DIATONIC_MIDI_NOTES = [60, 62, 64, 65, 67, 69, 71, 72] as const
export const CHROMATIC_MIDI_NOTES = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72] as const

export const MIDI_TO_NOTE_NAME: Record<number, string> = {
  60: 'C4',
  61: 'C#4',
  62: 'D4',
  63: 'Eb4',
  64: 'E4',
  65: 'F4',
  66: 'F#4',
  67: 'G4',
  68: 'Ab4',
  69: 'A4',
  70: 'Bb4',
  71: 'B4',
  72: 'C5',
}

export type VexflowPitch = {
  key: string
  staffPosition: string
  accidental?: string
}

export const MIDI_TO_VEXFLOW_PITCH: Record<number, VexflowPitch> = {
  60: { key: 'c/4', staffPosition: 'c/4' },
  61: { key: 'c#/4', staffPosition: 'c/4', accidental: '#' },
  62: { key: 'd/4', staffPosition: 'd/4' },
  63: { key: 'eb/4', staffPosition: 'e/4', accidental: 'b' },
  64: { key: 'e/4', staffPosition: 'e/4' },
  65: { key: 'f/4', staffPosition: 'f/4' },
  66: { key: 'f#/4', staffPosition: 'f/4', accidental: '#' },
  67: { key: 'g/4', staffPosition: 'g/4' },
  68: { key: 'ab/4', staffPosition: 'a/4', accidental: 'b' },
  69: { key: 'a/4', staffPosition: 'a/4' },
  70: { key: 'bb/4', staffPosition: 'b/4', accidental: 'b' },
  71: { key: 'b/4', staffPosition: 'b/4' },
  72: { key: 'c/5', staffPosition: 'c/5' },
}

export const MIDI_TO_VEXFLOW_PITCH_SHARPS: Record<number, VexflowPitch> = {
  ...MIDI_TO_VEXFLOW_PITCH,
  63: { key: 'd#/4', staffPosition: 'd/4', accidental: '#' },
  68: { key: 'g#/4', staffPosition: 'g/4', accidental: '#' },
  70: { key: 'a#/4', staffPosition: 'a/4', accidental: '#' },
}

export const MIDI_TO_VEXFLOW_PITCH_FLATS: Record<number, VexflowPitch> = {
  ...MIDI_TO_VEXFLOW_PITCH,
  61: { key: 'db/4', staffPosition: 'd/4', accidental: 'b' },
  66: { key: 'gb/4', staffPosition: 'g/4', accidental: 'b' },
}

export function isAllowedMidiNote(note: number) {
  return DIATONIC_MIDI_NOTES.includes(note as (typeof DIATONIC_MIDI_NOTES)[number])
}

export function isAllowedChromaticMidiNote(note: number) {
  return CHROMATIC_MIDI_NOTES.includes(note as (typeof CHROMATIC_MIDI_NOTES)[number])
}

export function melodyKey(melody: Melody) {
  return melody.join('-')
}

export function melodySoundKey(melody: readonly number[]) {
  return melody.join('-')
}

export function melodiesEqual(left: Melody, right: Melody) {
  return left.every((note, index) => note === right[index])
}

export function pitchForMidiNote(midiNote: number, accidentalMode: AccidentalMode = 'mixed') {
  if (accidentalMode === 'sharps') {
    return MIDI_TO_VEXFLOW_PITCH_SHARPS[midiNote]
  }

  if (accidentalMode === 'flats') {
    return MIDI_TO_VEXFLOW_PITCH_FLATS[midiNote]
  }

  return MIDI_TO_VEXFLOW_PITCH[midiNote]
}

export function melodyAccidentals(melody: readonly number[], accidentalMode: AccidentalMode = 'mixed') {
  const activeAccidentals = new Map<string, string>()

  return melody.map((midiNote) => {
    const pitch = pitchForMidiNote(midiNote, accidentalMode)
    const activeAccidental = activeAccidentals.get(pitch.staffPosition)

    if (pitch.accidental) {
      if (activeAccidental === pitch.accidental) {
        return undefined
      }

      activeAccidentals.set(pitch.staffPosition, pitch.accidental)
      return pitch.accidental
    }

    if (activeAccidental && activeAccidental !== 'n') {
      activeAccidentals.set(pitch.staffPosition, 'n')
      return 'n'
    }

    return undefined
  })
}

export function shiftDiatonic(note: number, steps: number) {
  const index = DIATONIC_MIDI_NOTES.indexOf(note as (typeof DIATONIC_MIDI_NOTES)[number])

  if (index === -1) {
    throw new Error(`Cannot shift non-diatonic MIDI note: ${note}`)
  }

  const nextIndex = Math.min(Math.max(index + steps, 0), DIATONIC_MIDI_NOTES.length - 1)
  return DIATONIC_MIDI_NOTES[nextIndex]
}
