import { useEffect, useRef } from 'react'
import { Accidental, Beam, Formatter, Ornament, Renderer, Stave, StaveNote, Voice } from 'vexflow'
import {
  melodyAccidentals,
  pitchForMidiNote,
  pitchForQuarterToneNote,
  quarterToneMelodyAccidentals,
} from '../game/music'
import type {
  AccidentalMode,
  Melody,
  OrnamentPlacement,
  QuarterToneMelody,
  RhythmDuration,
  RhythmPhrase,
} from '../game/types'

type ScoreOptionState = 'idle' | 'correct' | 'wrong'

export type ScoreOptionScore = {
  melody?: Melody
  quarterToneMelody?: QuarterToneMelody
  ornament?: OrnamentPlacement
  rhythmPhrase?: RhythmPhrase
  accidentalMode?: AccidentalMode
}

type ScoreOptionProps = {
  score: ScoreOptionScore
  optionNumber: number
  state: ScoreOptionState
  disabled: boolean
  onSelect: () => void
}

export function ScoreOption({ score, optionNumber, state, disabled, onSelect }: ScoreOptionProps) {
  const scoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const scoreElement = scoreRef.current
    if (!scoreElement) {
      return
    }

    scoreElement.replaceChildren()

    const width = Math.max(scoreElement.clientWidth, 280)
    const renderer = new Renderer(scoreElement, Renderer.Backends.SVG)
    renderer.resize(width, 118)

    const context = renderer.getContext()
    const stave = new Stave(8, 18, width - 16)
    stave.addClef('treble').addTimeSignature('4/4')
    stave.setContext(context).draw()

    const isRhythmScore = Boolean(score.rhythmPhrase)
    const accidentalMode = score.accidentalMode ?? 'mixed'
    const melodyAccidentalMarks = score.melody ? melodyAccidentals(score.melody, accidentalMode) : []
    const quarterToneAccidentalMarks = score.quarterToneMelody
      ? quarterToneMelodyAccidentals(score.quarterToneMelody)
      : []
    const notes = score.rhythmPhrase
      ? score.rhythmPhrase.map((event) => {
          const duration = `${vexflowDuration(event.duration)}${event.isRest ? 'r' : ''}`

          return new StaveNote({
            keys: [event.isRest ? 'b/4' : pitchForMidiNote(event.midiNote).key],
            duration,
          })
        })
      : score.quarterToneMelody
        ? score.quarterToneMelody.map((quarterToneNote, index) => {
            const pitch = pitchForQuarterToneNote(quarterToneNote)
            const note = new StaveNote({
              keys: [pitch.key],
              duration: 'q',
            })

            const accidental = quarterToneAccidentalMarks[index]
            if (accidental) {
              note.addModifier(new Accidental(accidental), 0)
            }

            return note
          })
        : score.melody!.map((midiNote, index) => {
            const pitch = pitchForMidiNote(midiNote, accidentalMode)
            const note = new StaveNote({
              keys: [pitch.key],
              duration: 'q',
            })

            const accidental = melodyAccidentalMarks[index]
            if (accidental) {
              note.addModifier(new Accidental(accidental), 0)
            }

            if (score.ornament?.noteIndex === index) {
              note.addModifier(new Ornament(score.ornament.kind), 0)
            }

            return note
          })

    const beams = isRhythmScore ? Beam.generateBeams(notes, { beamRests: false }) : []
    const voice = new Voice({ numBeats: 4, beatValue: 4 }).addTickables(notes)
    new Formatter().joinVoices([voice]).format([voice], width - 110)
    voice.draw(context, stave)
    beams.forEach((beam) => {
      beam.setContext(context).draw()
    })

    const svg = scoreElement.querySelector('svg')
    svg?.setAttribute('aria-hidden', 'true')
    svg?.setAttribute('focusable', 'false')
  }, [score])

  const stateClass = state === 'idle' ? '' : `score-option--${state}`
  const ariaDescription =
    state === 'correct'
      ? 'Correct answer'
      : state === 'wrong'
        ? 'Your selected answer was not quite right'
        : 'Answer option'

  return (
    <button
      type="button"
      className={`score-option ${stateClass}`}
      disabled={disabled}
      onClick={onSelect}
      aria-label={`Option ${optionNumber}. ${ariaDescription}.`}
    >
      <span className="score-option__label">Option {optionNumber}</span>
      <span ref={scoreRef} className="score-option__score" aria-hidden="true" />
    </button>
  )
}

function vexflowDuration(duration: RhythmDuration) {
  switch (duration) {
    case 1:
      return '8'
    case 2:
      return 'q'
    case 4:
      return 'h'
  }
}
