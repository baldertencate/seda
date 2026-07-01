import { describe, expect, it } from 'vitest'
import { melodyAccidentals, pitchForMidiNote } from './music'

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
