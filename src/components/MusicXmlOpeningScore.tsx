import { useEffect, useRef, useState } from 'react'
import { Accidental, Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow'

type MusicXmlNote = {
  keys: string[]
  duration: string
  accidentals: Array<string | undefined>
  isRest: boolean
  dots: number
  ticks: number
}

type MusicXmlOpeningScoreProps = {
  src: string
  measureNumber: string
}

type ParsedMeasure = {
  notes: MusicXmlNote[]
  timeSignature: {
    beats: number
    beatValue: number
  }
  divisions: number
}

export function MusicXmlOpeningScore({ src, measureNumber }: MusicXmlOpeningScoreProps) {
  const scoreRef = useRef<HTMLDivElement | null>(null)
  const [measure, setMeasure] = useState<ParsedMeasure | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadScore() {
      try {
        const response = await fetch(src)
        if (!response.ok) {
          throw new Error('Could not load the score.')
        }

        const xmlText = await response.text()
        const parsedMeasure = parseMeasure(xmlText, measureNumber)

        if (isMounted) {
          setMeasure(parsedMeasure)
          setError(null)
        }
      } catch {
        if (isMounted) {
          setError('The score could not be loaded.')
        }
      }
    }

    loadScore()

    return () => {
      isMounted = false
    }
  }, [measureNumber, src])

  useEffect(() => {
    const scoreElement = scoreRef.current
    if (!scoreElement || !measure || measure.notes.length === 0) {
      return
    }

    scoreElement.replaceChildren()

    const width = Math.max(scoreElement.clientWidth, 320)
    const renderer = new Renderer(scoreElement, Renderer.Backends.SVG)
    renderer.resize(width, 148)

    const context = renderer.getContext()
    const stave = new Stave(8, 28, width - 16)
    stave
      .addClef('treble')
      .addTimeSignature(`${measure.timeSignature.beats}/${measure.timeSignature.beatValue}`)
    stave.setContext(context).draw()

    const staveNotes = measure.notes.map((musicXmlNote) => {
      const staveNote = new StaveNote({
        keys: musicXmlNote.isRest ? ['b/4'] : musicXmlNote.keys,
        duration: `${musicXmlNote.duration}${musicXmlNote.isRest ? 'r' : ''}`,
      })

      musicXmlNote.accidentals.forEach((accidental, keyIndex) => {
        if (accidental) {
          staveNote.addModifier(new Accidental(accidental), keyIndex)
        }
      })

      for (let dotIndex = 0; dotIndex < musicXmlNote.dots; dotIndex += 1) {
        Dot.buildAndAttach([staveNote], { all: true })
      }

      return staveNote
    })

    const beams = Beam.generateBeams(staveNotes, { beamRests: false })
    const voice = new Voice({
      numBeats: measure.timeSignature.beats,
      beatValue: measure.timeSignature.beatValue,
    })
      .setStrict(false)
      .addTickables(staveNotes)
    new Formatter().joinVoices([voice]).format([voice], width - 112)
    voice.draw(context, stave)
    beams.forEach((beam) => {
      beam.setContext(context).draw()
    })

    const svg = scoreElement.querySelector('svg')
    svg?.setAttribute('role', 'img')
    svg?.setAttribute('aria-label', `Score excerpt, measure ${measureNumber}`)
  }, [measure, measureNumber])

  if (error) {
    return <p className="musicxml-score__message">{error}</p>
  }

  return (
    <div className="musicxml-score">
      <div ref={scoreRef} className="musicxml-score__notation" aria-live="polite" />
    </div>
  )
}

function parseMeasure(xmlText: string, measureNumber: string): ParsedMeasure {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml')
  const firstPart = document.querySelector('score-partwise > part')
  const measures = Array.from(firstPart?.querySelectorAll(':scope > measure') ?? [])
  const measureIndex = measures.findIndex(
    (candidate) => candidate.getAttribute('number') === measureNumber,
  )
  const measure = measures[measureIndex]

  if (!measure) {
    return {
      notes: [],
      timeSignature: { beats: 4, beatValue: 4 },
      divisions: 1,
    }
  }

  const timeSignature = inheritedTimeSignature(measures, measureIndex)
  const divisions = inheritedDivisions(measures, measureIndex)
  const primaryVoice = measure.querySelector(':scope > note > voice')?.textContent ?? null
  const notes = padMeasureNotes(
    groupChordNotes(
      Array.from(measure.querySelectorAll(':scope > note'))
    .filter((noteElement) => !noteElement.querySelector('grace'))
    .filter((noteElement) => {
      const voice = noteElement.querySelector('voice')?.textContent ?? primaryVoice

      return !primaryVoice || voice === primaryVoice
    })
        .filter((noteElement) => noteElement.querySelector('type')),
      divisions,
    ),
    measureDurationTicks(timeSignature, divisions),
  )

  return { notes, timeSignature, divisions }
}

function inheritedTimeSignature(measures: Element[], measureIndex: number) {
  for (let index = measureIndex; index >= 0; index -= 1) {
    const beats = measures[index].querySelector('attributes > time > beats')?.textContent
    const beatValue = measures[index].querySelector('attributes > time > beat-type')?.textContent

    if (beats && beatValue) {
      return {
        beats: Number(beats),
        beatValue: Number(beatValue),
      }
    }
  }

  return { beats: 4, beatValue: 4 }
}

function inheritedDivisions(measures: Element[], measureIndex: number) {
  for (let index = measureIndex; index >= 0; index -= 1) {
    const divisions = measures[index].querySelector('attributes > divisions')?.textContent

    if (divisions) {
      return Number(divisions)
    }
  }

  return 1
}

function groupChordNotes(noteElements: Element[], divisions: number): MusicXmlNote[] {
  const notes: MusicXmlNote[] = []

  for (const noteElement of noteElements) {
    const isChordTone = Boolean(noteElement.querySelector('chord'))

    if (isChordTone && notes.length > 0) {
      addChordTone(notes[notes.length - 1], noteElement)
      continue
    }

    notes.push(noteFromElement(noteElement, divisions))
  }

  return notes
}

function addChordTone(note: MusicXmlNote, noteElement: Element) {
  if (note.isRest) {
    return
  }

  note.keys.push(keyFromElement(noteElement))
  note.accidentals.push(accidentalFromMusicXml(noteElement))
}

function padMeasureNotes(notes: MusicXmlNote[], targetTicks: number) {
  const currentTicks = notes.reduce((total, note) => total + note.ticks, 0)
  const remainingTicks = targetTicks - currentTicks

  if (remainingTicks <= 0) {
    return notes
  }

  return [...notes, ...restNotesForTicks(remainingTicks)]
}

function restNotesForTicks(ticks: number): MusicXmlNote[] {
  const rests: MusicXmlNote[] = []
  const durations = [
    { ticks: 32, duration: 'w' },
    { ticks: 16, duration: 'h' },
    { ticks: 8, duration: 'q' },
    { ticks: 4, duration: '8' },
    { ticks: 2, duration: '16' },
    { ticks: 1, duration: '32' },
  ]
  let remainingTicks = ticks

  for (const duration of durations) {
    while (remainingTicks >= duration.ticks) {
      rests.push({
        keys: ['b/4'],
        duration: duration.duration,
        accidentals: [],
        isRest: true,
        dots: 0,
        ticks: duration.ticks,
      })
      remainingTicks -= duration.ticks
    }
  }

  return rests
}

function measureDurationTicks(timeSignature: ParsedMeasure['timeSignature'], _divisions: number) {
  return timeSignature.beats * (32 / timeSignature.beatValue)
}

function noteFromElement(noteElement: Element, divisions: number): MusicXmlNote {
  const type = noteElement.querySelector('type')?.textContent ?? 'quarter'
  const isRest = Boolean(noteElement.querySelector('rest'))
  const accidental = accidentalFromMusicXml(noteElement)
  const dots = noteElement.querySelectorAll('dot').length
  const durationTicks = Number(noteElement.querySelector('duration')?.textContent ?? '0')

  return {
    keys: [keyFromElement(noteElement)],
    duration: durationFromMusicXml(type),
    accidentals: [accidental],
    isRest,
    dots,
    ticks: durationTicksToFormatterTicks(durationTicks, divisions),
  }
}

function keyFromElement(noteElement: Element) {
  const pitchElement = noteElement.querySelector('pitch')
  const step = pitchElement?.querySelector('step')?.textContent?.toLowerCase() ?? 'b'
  const octave = pitchElement?.querySelector('octave')?.textContent ?? '4'

  return `${step}/${octave}`
}

function durationTicksToFormatterTicks(durationTicks: number, divisions: number) {
  return Math.round((durationTicks / divisions) * 8)
}

function durationFromMusicXml(type: string) {
  switch (type) {
    case '32nd':
      return '32'
    case '16th':
      return '16'
    case 'eighth':
      return '8'
    case 'quarter':
      return 'q'
    case 'half':
      return 'h'
    case 'whole':
      return 'w'
    default:
      return 'q'
  }
}

function accidentalFromMusicXml(noteElement: Element) {
  const accidental = noteElement.querySelector('accidental')?.textContent
  if (accidental) {
    return accidentalMark(accidental)
  }

  const alter = noteElement.querySelector('alter')?.textContent
  if (alter === '1') {
    return '#'
  }

  if (alter === '-1') {
    return 'b'
  }

  return undefined
}

function accidentalMark(accidental: string) {
  switch (accidental) {
    case 'sharp':
      return '#'
    case 'flat':
      return 'b'
    case 'natural':
      return 'n'
    default:
      return undefined
  }
}
