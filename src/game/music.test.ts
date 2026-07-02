import { describe, expect, it } from 'vitest'
import {
  melodyAccidentals,
  pitchForMidiNote,
  pitchForQuarterToneNote,
  quarterToneMelodyAccidentals,
} from './music'

describe('melodyAccidentals', () => {
  it('does not repeat the same accidental on the same staff position', () => {
    expect(melodyAccidentals([61, 61, 62, 61])).toEqual(['#', undefined, undefined, undefined])
  })

  it('adds a natural when an altered staff position returns to natural', () => {
    expect(melodyAccidentals([61, 60, 60, 61])).toEqual(['#', 'n', undefined, '#'])
  })

  it('tracks flats independently by staff position', () => {
    expect(melodyAccidentals([63, 64, 68, 69])).toEqual(['b', 'n', 'b', 'n'])
  })

  it('can spell chromatic pitches in sharp mode', () => {
    expect(pitchForMidiNote(63, 'sharps')).toMatchObject({
      key: 'd#/4',
      accidental: '#',
    })
    expect(melodyAccidentals([63, 62], 'sharps')).toEqual(['#', 'n'])
  })

  it('can spell chromatic pitches in flat mode', () => {
    expect(pitchForMidiNote(61, 'flats')).toMatchObject({
      key: 'db/4',
      accidental: 'b',
    })
    expect(melodyAccidentals([61, 62], 'flats')).toEqual(['b', 'n'])
  })
})

describe('quarterToneMelodyAccidentals', () => {
  it('uses koron, sori, flat, and sharp accidentals for altered notes', () => {
    expect(pitchForQuarterToneNote({ midi: 62, cents: -100 })).toMatchObject({
      key: 'db/4',
      accidental: 'b',
    })
    expect(pitchForQuarterToneNote({ midi: 60, cents: -50 })).toMatchObject({
      key: 'c/4',
      accidental: 'k',
    })
    expect(pitchForQuarterToneNote({ midi: 60, cents: 50 })).toMatchObject({
      key: 'c/4',
      accidental: 'o',
    })
    expect(pitchForQuarterToneNote({ midi: 60, cents: 100 })).toMatchObject({
      key: 'c#/4',
      accidental: '#',
    })
  })

  it('does not repeat altered accidentals and cancels them with naturals', () => {
    expect(
      quarterToneMelodyAccidentals([
        { midi: 60, cents: -50 },
        { midi: 60, cents: -50 },
        { midi: 60, cents: 0 },
        { midi: 60, cents: 50 },
      ]),
    ).toEqual(['k', undefined, 'n', 'o'])
  })
})
