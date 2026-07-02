export type Melody = [number, number, number, number]

export type QuarterToneOffset = -100 | -50 | 0 | 50 | 100

export type QuarterTonePitch = {
  midi: number
  cents: QuarterToneOffset
}

export type QuarterToneMelody = [
  QuarterTonePitch,
  QuarterTonePitch,
  QuarterTonePitch,
  QuarterTonePitch,
]

export type Question = {
  id: string
  target: Melody
  options: Melody[]
  correctOptionIndex: number
}

export type AccidentalMode = 'mixed' | 'sharps' | 'flats'

export type OrnamentKind = 'mordent' | 'mordentInverted' | 'turn' | 'turnInverted'

export type OrnamentPlacement = {
  noteIndex: number
  kind: OrnamentKind
}

export type OrnamentedMelody = {
  melody: Melody
  ornament: OrnamentPlacement
}

export type OrnamentQuestion = {
  id: string
  target: OrnamentedMelody
  options: OrnamentedMelody[]
  correctOptionIndex: number
}

export type RhythmDuration = 1 | 2 | 4

export type RhythmEvent = {
  duration: RhythmDuration
  isRest: boolean
  midiNote: number
}

export type RhythmPhrase = RhythmEvent[]

export type RhythmQuestion = {
  id: string
  target: RhythmPhrase
  options: RhythmPhrase[]
  correctOptionIndex: number
}
