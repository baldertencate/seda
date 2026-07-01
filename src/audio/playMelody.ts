import * as Tone from 'tone'
import { MIDI_TO_NOTE_NAME, shiftDiatonic } from '../game/music'
import type { Melody, OrnamentKind, OrnamentedMelody, RhythmPhrase } from '../game/types'
import type { Instrument } from './types'

const bpm = 90
const quarterNoteMs = 60_000 / bpm
const eighthNoteMs = quarterNoteMs / 2

type Player = Tone.Sampler | Tone.PolySynth

const players: Partial<Record<Instrument, Player>> = {}

function createSampler(instrument: Instrument) {
  const reverb = new Tone.Reverb({
    decay: instrument === 'piano' ? 1.4 : 2.2,
    wet: instrument === 'piano' ? 0.1 : 0.16,
  }).toDestination()

  const urls: Record<string, string> =
    instrument === 'piano'
      ? {
          C4: 'C4.mp3',
          D4: 'D4.mp3',
          E4: 'E4.mp3',
          F4: 'F4.mp3',
          G4: 'G4.mp3',
          A4: 'A4.mp3',
          B4: 'B4.mp3',
          C5: 'C5.mp3',
        }
      : {
          C4: 'C4.mp3',
          E4: 'E4.mp3',
          A4: 'A4.mp3',
          C5: 'C5.mp3',
          E5: 'E5.mp3',
        }

  return new Tone.Sampler({
    urls,
    baseUrl: `/samples/${instrument}/`,
    attack: instrument === 'piano' ? 0 : 0.02,
    release: instrument === 'piano' ? 0.7 : 0.35,
    volume: instrument === 'piano' ? -4 : -7,
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

export async function playMelody(melody: Melody, instrument: Instrument) {
  await Tone.start()

  const player = getPlayer(instrument)
  await Tone.loaded()

  for (const midiNote of melody) {
    player.triggerAttackRelease(MIDI_TO_NOTE_NAME[midiNote], '4n')
    await wait(quarterNoteMs)
  }
}

function ornamentNotes(note: number, kind: OrnamentKind) {
  const upper = shiftDiatonic(note, 1)
  const lower = shiftDiatonic(note, -1)

  switch (kind) {
    case 'mordent':
      return [note, upper, note]
    case 'mordentInverted':
      return [note, lower, note]
    case 'turn':
      return [upper, note, lower, note]
    case 'turnInverted':
      return [lower, note, upper, note]
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

    const notes = ornamentNotes(midiNote, score.ornament.kind)
    const ornamentNoteMs = quarterNoteMs / notes.length

    for (const note of notes) {
      player.triggerAttackRelease(MIDI_TO_NOTE_NAME[note], ornamentNoteMs / 1000)
      await wait(ornamentNoteMs)
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
