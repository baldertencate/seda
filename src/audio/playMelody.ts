import * as Tone from 'tone'
import { MIDI_TO_NOTE_NAME, shiftDiatonic } from '../game/music'
import type {
  Melody,
  OrnamentKind,
  OrnamentedMelody,
  QuarterToneMelody,
  QuarterTonePitch,
  RhythmPhrase,
} from '../game/types'
import type { Instrument } from './types'

const bpm = 90
const quarterNoteMs = 60_000 / bpm
const eighthNoteMs = quarterNoteMs / 2
const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`

type Player = Tone.Sampler | Tone.PolySynth
type OrnamentPlaybackEvent = {
  note: number
  durationMs: number
  velocity: number
}
type InstrumentSampleMap = Record<Instrument, Record<string, string>>
type SampleChoice = {
  file: string
  frequency: number
}

const sampleNoteOffsets: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

export type PitchMatchController = {
  setOffsetCents: (cents: number) => void
  stop: () => void
}

const players: Partial<Record<Instrument, Player>> = {}
const urlsByInstrument: InstrumentSampleMap = {
  piano: {
    C4: 'C4.mp3',
    D4: 'D4.mp3',
    E4: 'E4.mp3',
    F4: 'F4.mp3',
    G4: 'G4.mp3',
    A4: 'A4.mp3',
    B4: 'B4.mp3',
    C5: 'C5.mp3',
  },
  flute: {
    C4: 'C4.mp3',
    E4: 'E4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3',
    E5: 'E5.mp3',
  },
  setar: {
    C4: 'C4.wav',
    E4: 'E4.wav',
    A4: 'A4.wav',
    C5: 'C5.wav',
    E5: 'E5.wav',
  },
  violin: {
    C4: 'C4.mp3',
    E4: 'E4.mp3',
    A4: 'A4.mp3',
    C5: 'C5.mp3',
    E5: 'E5.mp3',
  },
  cello: {
    C3: 'C3.mp3',
    G3: 'G3.mp3',
    C4: 'C4.mp3',
    E4: 'E4.mp3',
    G4: 'G4.mp3',
  },
  trumpet: {
    C4: 'C4.mp3',
    F4: 'F4.mp3',
    G4: 'G4.mp3',
    D5: 'D5.mp3',
    A5: 'A5.mp3',
  },
  clarinet: {
    D4: 'D4.mp3',
    F4: 'F4.mp3',
    'A#4': 'As4.mp3',
    D5: 'D5.mp3',
    F5: 'F5.mp3',
  },
  trombone: {
    C3: 'C3.mp3',
    F3: 'F3.mp3',
    C4: 'C4.mp3',
    F4: 'F4.mp3',
  },
}

function isSustainingInstrument(instrument: Instrument) {
  return ['flute', 'violin', 'cello', 'trumpet', 'clarinet', 'trombone'].includes(instrument)
}

function reverbDecayFor(instrument: Instrument) {
  if (instrument === 'piano') {
    return 1.4
  }

  if (instrument === 'setar') {
    return 1.6
  }

  if (instrument === 'violin' || instrument === 'cello') {
    return 2.3
  }

  return 2.1
}

function reverbWetFor(instrument: Instrument) {
  if (instrument === 'piano') {
    return 0.1
  }

  if (instrument === 'setar') {
    return 0.08
  }

  return 0.16
}

function releaseFor(instrument: Instrument) {
  if (instrument === 'piano') {
    return 0.7
  }

  if (instrument === 'setar') {
    return 0.65
  }

  if (instrument === 'violin' || instrument === 'cello') {
    return 0.55
  }

  return 0.35
}

function volumeFor(instrument: Instrument) {
  if (instrument === 'piano') {
    return -4
  }

  if (instrument === 'setar') {
    return -6
  }

  if (instrument === 'trumpet' || instrument === 'trombone') {
    return -10
  }

  return -7
}

function createSampler(instrument: Instrument) {
  const reverb = new Tone.Reverb({
    decay: reverbDecayFor(instrument),
    wet: reverbWetFor(instrument),
  }).toDestination()

  return new Tone.Sampler({
    urls: urlsByInstrument[instrument],
    baseUrl: assetPath(`samples/${instrument}/`),
    attack: isSustainingInstrument(instrument) ? 0.02 : 0,
    release: releaseFor(instrument),
    volume: volumeFor(instrument),
  }).connect(reverb)
}

function createFallbackSynth() {
  return new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.02,
      decay: 0.12,
      sustain: 0.5,
      release: 0.35,
    },
    volume: -10,
  }).toDestination()
}

function getPlayer(instrument: Instrument) {
  try {
    players[instrument] ??= createSampler(instrument)
  } catch {
    players[instrument] ??= createFallbackSynth()
  }

  return players[instrument]
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function frequencyForQuarterTonePitch(pitch: QuarterTonePitch) {
  return 440 * 2 ** ((pitch.midi + pitch.cents / 100 - 69) / 12)
}

function frequencyForMidiNote(midiNote: number) {
  return 440 * 2 ** ((midiNote - 69) / 12)
}

function frequencyAtOffset(referenceFrequency: number, offsetCents: number) {
  return referenceFrequency * 2 ** (offsetCents / 1200)
}

function midiForSampleNote(sampleNote: string) {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(sampleNote)

  if (!match) {
    throw new Error(`Unsupported sample note name: ${sampleNote}`)
  }

  const [, pitchName, octave] = match

  return (Number(octave) + 1) * 12 + sampleNoteOffsets[pitchName]
}

function sampleChoicesFor(instrument: Instrument): SampleChoice[] {
  return Object.entries(urlsByInstrument[instrument]).map(([sampleNote, file]) => ({
    file,
    frequency: frequencyForMidiNote(midiForSampleNote(sampleNote)),
  }))
}

function chooseNearestSample(instrument: Instrument, targetFrequency: number) {
  return sampleChoicesFor(instrument).reduce<SampleChoice | null>((nearest, choice) => {
    if (nearest === null) {
      return choice
    }

    const nearestDistance = Math.abs(Math.log2(nearest.frequency / targetFrequency))
    const choiceDistance = Math.abs(Math.log2(choice.frequency / targetFrequency))

    return choiceDistance < nearestDistance ? choice : nearest
  }, null)
}

export async function startPitchMatchTone(
  referenceFrequency: number,
  initialOffsetCents: number,
  instrument: Instrument,
): Promise<PitchMatchController> {
  await Tone.start()

  const output = new Tone.Gain(0).toDestination()
  const referenceGain = new Tone.Gain(0).connect(output)
  const adjustableGain = new Tone.Gain(0).connect(output)
  const referenceOscillator = new Tone.Oscillator(referenceFrequency, 'triangle').connect(referenceGain)
  const initialFrequency = frequencyAtOffset(referenceFrequency, initialOffsetCents)
  const sampleChoice = chooseNearestSample(instrument, initialFrequency)

  if (sampleChoice === null) {
    throw new Error(`No samples are configured for ${instrument}`)
  }

  const adjustablePlayer = new Tone.Player({
    url: assetPath(`samples/${instrument}/${sampleChoice.file}`),
    loop: true,
    fadeIn: 0.03,
    fadeOut: 0.04,
  }).connect(adjustableGain)

  await Tone.loaded()

  const now = Tone.now()
  adjustablePlayer.playbackRate = initialFrequency / sampleChoice.frequency

  output.gain.setValueAtTime(0, now)
  output.gain.linearRampToValueAtTime(0.2, now + 0.03)

  referenceGain.gain.setValueAtTime(0, now)
  referenceGain.gain.linearRampToValueAtTime(0.2, now + 0.03)

  adjustableGain.gain.setValueAtTime(0, now + 0.72)
  adjustableGain.gain.linearRampToValueAtTime(0.16, now + 0.9)

  referenceOscillator.start(now)
  adjustablePlayer.start(now + 0.72)

  let isStopped = false
  let isReferenceDisposed = false
  let isAdjustableDisposed = false

  function disposeReference() {
    if (isReferenceDisposed) {
      return
    }

    isReferenceDisposed = true
    referenceOscillator.dispose()
    referenceGain.dispose()
  }

  function disposeAdjustable() {
    if (isAdjustableDisposed) {
      return
    }

    isAdjustableDisposed = true
    adjustablePlayer.dispose()
    adjustableGain.dispose()
  }

  referenceOscillator.onstop = disposeReference

  return {
    setOffsetCents(cents: number) {
      if (isStopped) {
        return
      }

      adjustablePlayer.playbackRate = frequencyAtOffset(referenceFrequency, cents) / sampleChoice.frequency
    },
    stop() {
      if (isStopped) {
        return
      }

      isStopped = true
      const stopTime = Tone.now() + 0.04
      output.gain.cancelScheduledValues(Tone.now())
      output.gain.linearRampToValueAtTime(0, stopTime)
      referenceGain.gain.cancelScheduledValues(Tone.now())
      adjustableGain.gain.cancelScheduledValues(Tone.now())
      referenceGain.gain.linearRampToValueAtTime(0, stopTime)
      adjustableGain.gain.linearRampToValueAtTime(0, stopTime)
      if (!isReferenceDisposed) {
        referenceOscillator.stop(stopTime)
      }
      adjustablePlayer.stop(stopTime)
      adjustablePlayer.onstop = () => {
        disposeReference()
        disposeAdjustable()
        output.dispose()
      }
    },
  }
}

export async function playMelody(melody: Melody, instrument: Instrument) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const midiNote of melody) {
    player.triggerAttackRelease(MIDI_TO_NOTE_NAME[midiNote], '4n')
    await wait(quarterNoteMs)
  }
}

export async function playMidiSequence(sequence: number[], instrument: Instrument) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const midiNote of sequence) {
    player.triggerAttackRelease(frequencyForMidiNote(midiNote), '8n')
    await wait(eighthNoteMs)
  }
}

export async function playInterval(tonic: number, targetNote: number, instrument: Instrument) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const midiNote of [tonic, targetNote]) {
    player.triggerAttackRelease(MIDI_TO_NOTE_NAME[midiNote], '4n')
    await wait(quarterNoteMs)
  }
}

export async function playPitchPair(
  firstFrequency: number,
  secondFrequency: number,
  instrument: Instrument,
) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const frequency of [firstFrequency, secondFrequency]) {
    player.triggerAttackRelease(frequency, '4n')
    await wait(quarterNoteMs)
  }
}

export async function playQuarterToneMelody(melody: QuarterToneMelody, instrument: Instrument) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const pitch of melody) {
    player.triggerAttackRelease(frequencyForQuarterTonePitch(pitch), '4n')
    await wait(quarterNoteMs)
  }
}

function ornamentPlaybackEvents(note: number, kind: OrnamentKind): OrnamentPlaybackEvent[] {
  const upper = shiftDiatonic(note, 1)
  const lower = shiftDiatonic(note, -1)

  switch (kind) {
    case 'mordent': {
      return [
        { note, durationMs: quarterNoteMs / 8, velocity: 0.74 },
        { note: upper, durationMs: quarterNoteMs / 8, velocity: 0.68 },
        { note, durationMs: (quarterNoteMs * 3) / 4, velocity: 0.86 },
      ]
    }
    case 'mordentInverted': {
      return [
        { note, durationMs: quarterNoteMs / 8, velocity: 0.74 },
        { note: lower, durationMs: quarterNoteMs / 8, velocity: 0.68 },
        { note, durationMs: (quarterNoteMs * 3) / 4, velocity: 0.86 },
      ]
    }
    case 'turn':
      return [
        { note: upper, durationMs: quarterNoteMs / 8, velocity: 0.66 },
        { note, durationMs: quarterNoteMs / 8, velocity: 0.7 },
        { note: lower, durationMs: quarterNoteMs / 8, velocity: 0.66 },
        { note, durationMs: (quarterNoteMs * 5) / 8, velocity: 0.86 },
      ]
    case 'turnInverted':
      return [
        { note: lower, durationMs: quarterNoteMs / 8, velocity: 0.66 },
        { note, durationMs: quarterNoteMs / 8, velocity: 0.7 },
        { note: upper, durationMs: quarterNoteMs / 8, velocity: 0.66 },
        { note, durationMs: (quarterNoteMs * 5) / 8, velocity: 0.86 },
      ]
  }
}

export async function playOrnamentedMelody(score: OrnamentedMelody, instrument: Instrument) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const [index, midiNote] of score.melody.entries()) {
    if (index !== score.ornament.noteIndex) {
      player.triggerAttackRelease(MIDI_TO_NOTE_NAME[midiNote], '4n')
      await wait(quarterNoteMs)
      continue
    }

    const events = ornamentPlaybackEvents(midiNote, score.ornament.kind)

    for (const event of events) {
      player.triggerAttackRelease(
        MIDI_TO_NOTE_NAME[event.note],
        event.durationMs / 1000,
        undefined,
        event.velocity,
      )
      await wait(event.durationMs)
    }
  }
}

export async function playRhythmPhrase(phrase: RhythmPhrase, instrument: Instrument) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const event of phrase) {
    const durationMs = event.duration * eighthNoteMs

    if (!event.isRest) {
      player.triggerAttackRelease(MIDI_TO_NOTE_NAME[event.midiNote], durationMs / 1000)
    }

    await wait(durationMs)
  }
}
