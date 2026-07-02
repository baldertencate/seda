import { useEffect, useRef, useState } from 'react'
import { Accidental, Beam, Dot, Formatter, Renderer, Stave, StaveNote, Voice } from 'vexflow'

type MusicXmlNote = {
  key: string
  duration: string
  accidental?: string
  isRest: boolean
  dots: number
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
        keys: [musicXmlNote.isRest ? 'b/4' : musicXmlNote.key],
        duration: `${musicXmlNote.duration}${musicXmlNote.isRest ? 'r' : ''}`,
      })

      if (musicXmlNote.accidental) {
        staveNote.addModifier(new Accidental(musicXmlNote.accidental), 0)
      }

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
    }
  }

  const timeSignature = inheritedTimeSignature(measures, measureIndex)
  const primaryVoice = measure.querySelector(':scope > note > voice')?.textContent ?? null
  const notes = Array.from(measure.querySelectorAll(':scope > note'))
    .filter((noteElement) => !noteElement.querySelector('grace'))
    .filter((noteElement) => {
      const voice = noteElement.querySelector('voice')?.textContent ?? primaryVoice

      return !primaryVoice || voice === primaryVoice
    })
    .filter((noteElement) => noteElement.querySelector('type'))
    .map(noteFromElement)

  return { notes, timeSignature }
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

function noteFromElement(noteElement: Element): MusicXmlNote {
  const type = noteElement.querySelector('type')?.textContent ?? 'quarter'
  const isRest = Boolean(noteElement.querySelector('rest'))
  const pitchElement = noteElement.querySelector('pitch')
  const step = pitchElement?.querySelector('step')?.textContent?.toLowerCase() ?? 'b'
  const octave = pitchElement?.querySelector('octave')?.textContent ?? '4'
  const accidental = accidentalFromMusicXml(noteElement)
  const dots = noteElement.querySelectorAll('dot').length

  return {
    key: `${step}/${octave}`,
    duration: durationFromMusicXml(type),
    accidental,
    isRest,
    dots,
  }
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
