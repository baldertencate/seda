import { useEffect, useMemo, useRef, useState } from 'react'
import {
  playInterval,
  playMelody,
  playOrnamentedMelody,
  playQuarterToneMelody,
  playRhythmPhrase,
} from './audio/playMelody'
import { INSTRUMENT_LABELS, type Instrument } from './audio/types'
import { ComposerGuide, type ComposerId } from './components/ComposerGuide'
import { MusicXmlOpeningScore } from './components/MusicXmlOpeningScore'
import { ScoreOption, type ScoreOptionScore } from './components/ScoreOption'
import { StatusBar } from './components/StatusBar'
import { generateChromaticQuestion, type ChromaticQuestion } from './game/generateChromaticQuestion'
import {
  generateIntervalQuestion,
  intervalOptionKey,
} from './game/generateIntervalQuestion'
import { generateOrnamentQuestion } from './game/generateOrnamentQuestion'
import {
  generateQuarterToneQuestion,
  type QuarterToneQuestion,
} from './game/generateQuarterToneQuestion'
import { generateQuestion } from './game/generateQuestion'
import { generateRhythmQuestion, rhythmPhraseKey } from './game/generateRhythmQuestion'
import { melodyKey, quarterToneMelodyKey } from './game/music'
import type {
  Melody,
  IntervalOption,
  IntervalQuestion,
  OrnamentQuestion,
  OrnamentedMelody,
  Question,
  QuarterToneMelody,
  RhythmPhrase,
  RhythmQuestion,
} from './game/types'
import './styles.css'

const maxQuestions = 10
const maxMistakes = 3
const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`
const audiblePeakThreshold = 0.015
const audibleRmsThreshold = 0.004

type ClassicalPieceId = 'beethoven-fur-elise' | 'bach-goldberg-aria' | 'bach-goldberg-variation-1'
type ScrapedBar = {
  measureNumber: string
  startSeconds: number
  endSeconds: number
  pattern: string
}

type ScrapedAlignmentMeasure = {
  measure: number
  start: number
  end: number
  duration?: number
}

type ScrapedAlignmentFile = {
  exercise_measures?: ScrapedAlignmentMeasure[]
  measures?: ScrapedAlignmentMeasure[]
}

type ClassicalPieceConfig = {
  id: ClassicalPieceId
  title: string
  composer: ComposerId
  scorePath: string
  recordingPath: string
  pickupSeconds: number
  barSeconds: number
  bars: Array<{
    measureNumber: string
    pattern: string
  }>
}

const classicalPieces: ClassicalPieceConfig[] = [
  {
    id: 'beethoven-fur-elise',
    title: 'Fur Elise',
    composer: 'beethoven',
    scorePath: assetPath('exercises/classical-piano/beethoven-fur-elise/score.musicxml'),
    recordingPath: assetPath('exercises/classical-piano/beethoven-fur-elise/recording.mp3'),
    pickupSeconds: 0.42,
    barSeconds: 176.613878 / 126,
    bars: [
      { measureNumber: '1', pattern: 'beethoven-opening-turn' },
      { measureNumber: '2', pattern: 'beethoven-a-minor-arpeggio' },
      { measureNumber: '4', pattern: 'beethoven-c-high-e' },
      { measureNumber: '8', pattern: 'beethoven-a-quarter-pickup' },
      { measureNumber: '16', pattern: 'beethoven-rising-scale' },
      { measureNumber: '20', pattern: 'beethoven-b-rest-high-e' },
      { measureNumber: '21', pattern: 'beethoven-rest-high-octave' },
      { measureNumber: '22', pattern: 'beethoven-e-d-sharp-neighbor' },
      { measureNumber: '47', pattern: 'beethoven-descending-scale' },
      { measureNumber: '49', pattern: 'beethoven-c-quarter-d-sharp' },
    ],
  },
  {
    id: 'bach-goldberg-aria',
    title: 'Goldberg Aria',
    composer: 'bach',
    scorePath: assetPath('exercises/classical-piano/bach-goldberg-aria/score.musicxml'),
    recordingPath: assetPath('exercises/classical-piano/bach-goldberg-aria/recording.mp3'),
    pickupSeconds: 0,
    barSeconds: 299.544 / 64,
    bars: [
      { measureNumber: '1', pattern: 'aria-opening' },
      { measureNumber: '2', pattern: 'aria-second-bar' },
      { measureNumber: '3', pattern: 'aria-third-bar' },
      { measureNumber: '4', pattern: 'aria-ornamented-run' },
      { measureNumber: '5', pattern: 'aria-fifth-bar' },
      { measureNumber: '6', pattern: 'aria-sixth-bar' },
      { measureNumber: '7', pattern: 'aria-long-32nds' },
      { measureNumber: '8', pattern: 'aria-eighth-bar' },
      { measureNumber: '9', pattern: 'aria-ninth-bar' },
      { measureNumber: '10', pattern: 'aria-tenth-bar' },
    ],
  },
  {
    id: 'bach-goldberg-variation-1',
    title: 'Goldberg Variation 1',
    composer: 'bach',
    scorePath: assetPath('exercises/classical-piano/bach-goldberg-variation-1/score.musicxml'),
    recordingPath: assetPath('exercises/classical-piano/bach-goldberg-variation-1/recording.mp3'),
    pickupSeconds: 0,
    barSeconds: 115.512 / 64,
    bars: [
      { measureNumber: '1', pattern: 'variation-opening' },
      { measureNumber: '2', pattern: 'variation-second-bar' },
      { measureNumber: '3', pattern: 'variation-third-bar' },
      { measureNumber: '4', pattern: 'variation-fourth-bar' },
      { measureNumber: '5', pattern: 'variation-fifth-bar' },
      { measureNumber: '6', pattern: 'variation-sixth-bar' },
      { measureNumber: '7', pattern: 'variation-seventh-bar' },
      { measureNumber: '8', pattern: 'variation-eighth-bar' },
      { measureNumber: '9', pattern: 'variation-ninth-bar' },
      { measureNumber: '10', pattern: 'variation-tenth-bar' },
    ],
  },
]

const scrapedScorePath = assetPath('exercises/scraped/fur-elise-fixture/score.musicxml')
const scrapedRecordingPath = assetPath('exercises/scraped/fur-elise-fixture/recording.mp3')
const scrapedAlignmentPath = assetPath('exercises/scraped/fur-elise-fixture/alignment.json')

type RecordingClip = {
  context: AudioContext
  buffer: AudioBuffer
  audibleStartSeconds: number
}

type ClassicalBar = {
  id: string
  pieceId: ClassicalPieceId
  pieceTitle: string
  composer: ComposerId
  scorePath: string
  recordingPath: string
  measureNumber: string
  measureIndex: number
  pickupSeconds: number
  barSeconds: number
  pattern: string
}

type ClassicalBarQuestion = {
  id: string
  target: ClassicalBar
  options: ClassicalBar[]
  correctOptionIndex: number
}

type ClassicalBarExerciseState = {
  questionOrder: ClassicalBar[]
  question: ClassicalBarQuestion
}

type ScrapedBarQuestion = {
  id: string
  target: ScrapedBar
  options: ScrapedBar[]
  correctOptionIndex: number
}

type ScrapedBarExerciseState = {
  questionOrder: ScrapedBar[]
  question: ScrapedBarQuestion
}

const classicalBars = classicalPieces.flatMap((piece) =>
  piece.bars.map((bar) => ({
    id: `${piece.id}-${bar.measureNumber}`,
    pieceId: piece.id,
    pieceTitle: piece.title,
    composer: piece.composer,
    scorePath: piece.scorePath,
    recordingPath: piece.recordingPath,
    measureNumber: bar.measureNumber,
    measureIndex: Number(bar.measureNumber) - 1,
    pickupSeconds: piece.pickupSeconds,
    barSeconds: piece.barSeconds,
    pattern: bar.pattern,
  })),
)

const barsByPiece = classicalPieces.reduce<Record<ClassicalPieceId, ClassicalBar[]>>(
  (barsById, piece) => {
    barsById[piece.id] = classicalBars.filter((bar) => bar.pieceId === piece.id)

    return barsById
  },
  {
    'beethoven-fur-elise': [],
    'bach-goldberg-aria': [],
    'bach-goldberg-variation-1': [],
  },
)

const recordingClipPromises: Partial<Record<ClassicalPieceId, Promise<RecordingClip>>> = {}
let scrapedClipPromise: Promise<RecordingClip> | null = null
let scrapedBarsPromise: Promise<ScrapedBar[]> | null = null

async function loadClassicalClip(bar: ClassicalBar) {
  const clipPromise = recordingClipPromises[bar.pieceId] ?? loadRecordingClip(bar.recordingPath)
  recordingClipPromises[bar.pieceId] = clipPromise

  return clipPromise
}

async function loadScrapedClip() {
  scrapedClipPromise ??= loadRecordingClip(scrapedRecordingPath)

  return scrapedClipPromise
}

async function loadScrapedBars() {
  scrapedBarsPromise ??= fetch(scrapedAlignmentPath).then(async (response) => {
    if (!response.ok) {
      throw new Error('The alignment could not be loaded.')
    }

    const alignment = (await response.json()) as ScrapedAlignmentFile
    const measures = alignment.exercise_measures ?? alignment.measures ?? []

    return measures
      .filter((measure) => measure.end > measure.start)
      .map((measure) => ({
        measureNumber: String(measure.measure),
        startSeconds: measure.start,
        endSeconds: measure.end,
        pattern: `scraped-${measure.measure}`,
      }))
  })

  return scrapedBarsPromise
}

async function loadRecordingClip(src: string): Promise<RecordingClip> {
  const context = new AudioContext()
  const response = await fetch(src)

  if (!response.ok) {
    throw new Error('The recording could not be loaded.')
  }

  const buffer = await context.decodeAudioData(await response.arrayBuffer())

  return {
    context,
    buffer,
    audibleStartSeconds: findAudibleStart(buffer),
  }
}

function findAudibleStart(buffer: AudioBuffer) {
  const channelData = buffer.getChannelData(0)
  const windowSize = Math.floor(buffer.sampleRate * 0.02)

  for (let index = 0; index < channelData.length; index += windowSize) {
    let peak = 0
    let sumSquares = 0
    const windowEnd = Math.min(index + windowSize, channelData.length)

    for (let sampleIndex = index; sampleIndex < windowEnd; sampleIndex += 1) {
      const value = Math.abs(channelData[sampleIndex])
      peak = Math.max(peak, value)
      sumSquares += value * value
    }

    const rms = Math.sqrt(sumSquares / Math.max(1, windowEnd - index))
    if (peak > audiblePeakThreshold || rms > audibleRmsThreshold) {
      return index / buffer.sampleRate
    }
  }

  return 0
}

function stopAudioSource(source: AudioBufferSourceNode | null) {
  try {
    source?.stop()
  } catch {
    // The source may already have ended.
  }
}

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function createClassicalBarQuestionOrder(pieceId: ClassicalPieceId) {
  return shuffled(barsByPiece[pieceId]).slice(0, maxQuestions)
}

function createClassicalBarQuestion(target: ClassicalBar, optionPool: ClassicalBar[]): ClassicalBarQuestion {
  const usedPatterns = new Set([target.pattern])
  const distractors: ClassicalBar[] = []

  for (const candidate of shuffled(optionPool)) {
    const pattern = candidate.pattern

    if (
      candidate.id === target.id ||
      usedPatterns.has(pattern) ||
      distractors.length >= 2
    ) {
      continue
    }

    usedPatterns.add(pattern)
    distractors.push(candidate)
  }

  const options = shuffled([target, ...distractors])

  return {
    id: `classical-bar-${target.id}-${options.map((option) => option.id).join('-')}`,
    target,
    options,
    correctOptionIndex: options.findIndex((option) => option.id === target.id),
  }
}

function createClassicalBarExerciseState(pieceId: ClassicalPieceId): ClassicalBarExerciseState {
  const questionOrder = createClassicalBarQuestionOrder(pieceId)

  return {
    questionOrder,
    question: createClassicalBarQuestion(questionOrder[0], barsByPiece[pieceId]),
  }
}

function createScrapedQuestionOrder(bars: ScrapedBar[]) {
  return shuffled(bars).slice(0, maxQuestions)
}

function createScrapedBarQuestion(target: ScrapedBar, bars: ScrapedBar[]): ScrapedBarQuestion {
  const usedPatterns = new Set([target.pattern])
  const distractors: ScrapedBar[] = []

  for (const candidate of shuffled(bars)) {
    if (
      candidate.measureNumber === target.measureNumber ||
      usedPatterns.has(candidate.pattern) ||
      distractors.length >= 3
    ) {
      continue
    }

    usedPatterns.add(candidate.pattern)
    distractors.push(candidate)
  }

  const options = shuffled([target, ...distractors])

  return {
    id: `scraped-bar-${target.measureNumber}-${options
      .map((option) => option.measureNumber)
      .join('-')}`,
    target,
    options,
    correctOptionIndex: options.findIndex(
      (option) => option.measureNumber === target.measureNumber,
    ),
  }
}

function createScrapedBarExerciseState(bars: ScrapedBar[]): ScrapedBarExerciseState {
  const questionOrder = createScrapedQuestionOrder(bars)

  return {
    questionOrder,
    question: createScrapedBarQuestion(questionOrder[0], bars),
  }
}

function classicalBarOffset(bar: ClassicalBar) {
  return bar.pickupSeconds + Math.max(0, bar.measureIndex) * bar.barSeconds
}

type ExerciseId =
  | 'pitches'
  | 'pitches-2'
  | 'pitches-3'
  | 'ornaments'
  | 'rhythms'
  | 'intervals'
  | 'score-match'
  | 'scraped-bars'
type ExerciseCategoryId = 'pitches' | 'ornaments' | 'rhythms' | 'intervals' | 'score-match'

type AnswerState = {
  selectedIndex: number
  wasCorrect: boolean
}

type ExerciseSessionProps<TQuestion extends { id: string; options: TOption[]; correctOptionIndex: number }, TOption> = {
  title: string
  description: string
  idlePrompt: string
  createQuestion: () => TQuestion
  getOptionKey: (option: TOption) => string
  getOptionScore: (option: TOption, question: TQuestion) => ScoreOptionScore
  playTarget: (question: TQuestion, instrument: Instrument) => Promise<void>
  composer: ComposerId
  instrument: Instrument
  onBackHome: () => void
}

type InstrumentSelectorProps = {
  instrument: Instrument
  onChange: (instrument: Instrument) => void
}

const exerciseCategories: Array<{
  id: ExerciseCategoryId
  title: string
  description: string
}> = [
  {
    id: 'pitches',
    title: 'Recognize pitches',
    description: 'Hear a short melody and choose the matching score.',
  },
  {
    id: 'ornaments',
    title: 'Recognize ornaments',
    description: 'Hear an ornamented phrase and choose the matching notation.',
  },
  {
    id: 'rhythms',
    title: 'Recognize rhythms',
    description: 'Hear notes and rests of different lengths, then choose the matching rhythm.',
  },
  {
    id: 'intervals',
    title: 'Recognize intervals',
    description: 'Hear two notes and name the distance between them.',
  },
  {
    id: 'score-match',
    title: 'Score vs recording',
    description: 'Compare a score excerpt with a real recording.',
  },
]

const exerciseLevels: Record<
  ExerciseCategoryId,
  Array<{
    id: ExerciseId
    title: string
    description: string
  }>
> = {
  pitches: [
    {
      id: 'pitches',
      title: 'Level 1: Natural notes',
      description: 'Four quarter notes using natural notes from C4 through C5.',
    },
    {
      id: 'pitches-2',
      title: 'Level 2: Sharps and flats',
      description: 'Chromatic melodies with accidentals, without mixing sharps and flats.',
    },
    {
      id: 'pitches-3',
      title: 'Level 3: Koron and sori',
      description: 'Quarter-tone melodies using half-flats, half-sharps, and full accidentals.',
    },
  ],
  ornaments: [
    {
      id: 'ornaments',
      title: 'Level 1: Basic ornaments',
      description: 'Find the score with the ornament you heard.',
    },
  ],
  rhythms: [
    {
      id: 'rhythms',
      title: 'Level 1: Notes and rests',
      description: 'Match a one-bar rhythm made from notes and rests.',
    },
  ],
  intervals: [
    {
      id: 'intervals',
      title: 'Level 1: Natural intervals',
      description: 'Hear one natural note followed by another and name the interval size.',
    },
  ],
  'score-match': [
    {
      id: 'score-match',
      title: 'Classical piano bars',
      description: 'Match one-bar excerpts from Beethoven and Bach to the correct score.',
    },
    {
      id: 'scraped-bars',
      title: 'Scraped aligned bars',
      description: 'Use measured score/audio alignment from the scraping corpus.',
    },
  ],
}

function InstrumentSelector({ instrument, onChange }: InstrumentSelectorProps) {
  return (
    <fieldset className="instrument-selector" aria-label="Instrument">
      <legend>Instrument</legend>
      {(['piano', 'flute', 'setar'] as const).map((option) => (
        <button
          key={option}
          type="button"
          className={
            option === instrument
              ? 'instrument-selector__option is-selected'
              : 'instrument-selector__option'
          }
          onClick={() => onChange(option)}
          aria-pressed={option === instrument}
        >
          {INSTRUMENT_LABELS[option]}
        </button>
      ))}
    </fieldset>
  )
}

function SettingsMenu({
  instrument,
  isOpen,
  onInstrumentChange,
  onOpen,
  onClose,
}: {
  instrument: Instrument
  isOpen: boolean
  onInstrumentChange: (instrument: Instrument) => void
  onOpen: () => void
  onClose: () => void
}) {
  return (
    <>
      <button
        type="button"
        className="settings-button"
        onClick={onOpen}
        aria-label="Open settings"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span aria-hidden="true">⚙</span>
      </button>

      {isOpen ? (
        <div className="settings-backdrop" onClick={onClose}>
          <section
            className="settings-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="settings-panel__header">
              <h2 id="settings-title">Settings</h2>
              <button type="button" className="settings-panel__close" onClick={onClose} aria-label="Close settings">
                <span aria-hidden="true">x</span>
              </button>
            </header>

            <InstrumentSelector instrument={instrument} onChange={onInstrumentChange} />
          </section>
        </div>
      ) : null}
    </>
  )
}

function HomeScreen({
  onSelectCategory,
}: {
  onSelectCategory: (category: ExerciseCategoryId) => void
}) {
  return (
    <main className="app-shell">
      <section className="home-screen" aria-labelledby="home-title">
        <header className="app-header">
          <h1 id="home-title">Ear Trainer</h1>
          <p>Choose a listening exercise.</p>
        </header>

        <div className="exercise-grid">
          {exerciseCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`exercise-card exercise-card--${category.id}`}
              onClick={() => onSelectCategory(category.id)}
              aria-label={`Choose ${category.title} levels`}
            >
              <span>{category.title}</span>
              <small>{category.description}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function LevelMenuScreen({
  categoryId,
  onSelectExercise,
  onBackHome,
}: {
  categoryId: ExerciseCategoryId
  onSelectExercise: (exercise: ExerciseId) => void
  onBackHome: () => void
}) {
  const category = exerciseCategories.find((candidate) => candidate.id === categoryId)

  if (!category) {
    return null
  }

  return (
    <main className="app-shell">
      <section className="home-screen home-screen--levels" aria-labelledby="level-menu-title">
        <header className="app-header app-header--with-back">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <div>
            <h1 id="level-menu-title">{category.title}</h1>
            <p>Choose a level.</p>
          </div>
        </header>

        <div className="exercise-grid">
          {exerciseLevels[categoryId].map((level) => (
            <button
              key={level.id}
              type="button"
              className={`exercise-card level-card level-card--${level.id}`}
              onClick={() => onSelectExercise(level.id)}
              aria-label={`Start ${category.title}, ${level.title}`}
            >
              <span>{level.title}</span>
              <small>{level.description}</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function ExerciseSession<
  TQuestion extends { id: string; options: TOption[]; correctOptionIndex: number },
  TOption,
>({
  title,
  description,
  idlePrompt,
  createQuestion,
  getOptionKey,
  getOptionScore,
  playTarget,
  composer,
  instrument,
  onBackHome,
}: ExerciseSessionProps<TQuestion, TOption>) {
  const [question, setQuestion] = useState<TQuestion>(() => createQuestion())
  const [questionNumber, setQuestionNumber] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [answer, setAnswer] = useState<AnswerState | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  const feedback = useMemo(() => {
    if (!answer) {
      return idlePrompt
    }

    return answer.wasCorrect ? 'Correct' : 'Not quite'
  }, [answer, idlePrompt])

  async function handlePlay() {
    setIsPlaying(true)

    try {
      await playTarget(question, instrument)
    } finally {
      setIsPlaying(false)
    }
  }

  function handleAnswer(selectedIndex: number) {
    const currentQuestion = question

    if (answer || !currentQuestion) {
      return
    }

    const wasCorrect = selectedIndex === currentQuestion.correctOptionIndex
    const nextMistakes = wasCorrect ? mistakes : mistakes + 1
    const nextCorrectCount = wasCorrect ? correctCount + 1 : correctCount

    setAnswer({ selectedIndex, wasCorrect })
    setCorrectCount(nextCorrectCount)
    setMistakes(nextMistakes)

    if (nextMistakes >= maxMistakes || questionNumber >= maxQuestions) {
      setIsFinished(true)
    }
  }

  function handleNextQuestion() {
    setQuestion(createQuestion())
    setQuestionNumber((current) => current + 1)
    setAnswer(null)
  }

  function handleReset() {
    setQuestion(createQuestion())
    setQuestionNumber(1)
    setCorrectCount(0)
    setMistakes(0)
    setAnswer(null)
    setIsFinished(false)
    setIsPlaying(false)
  }

  if (isFinished && answer) {
    const endedEarly = mistakes >= maxMistakes

    return (
      <main className="app-shell">
        <section className="result-panel" aria-labelledby="result-title">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <h1 id="result-title">Result</h1>
          <p>
            You answered {correctCount} out of {questionNumber} question
            {questionNumber === 1 ? '' : 's'} correctly.
          </p>
          <p>{endedEarly ? 'The exercise ended after three mistakes.' : 'You reached question 10.'}</p>
          <button type="button" className="button button--primary" onClick={handleReset}>
            Play again
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="exercise" aria-labelledby="app-title">
        <header className="app-header app-header--with-back">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <div>
            <h1 id="app-title">{title}</h1>
            <p>
              {description} Playing with {INSTRUMENT_LABELS[instrument].toLowerCase()}.
            </p>
          </div>
        </header>

        <StatusBar
          questionNumber={questionNumber}
          totalQuestions={maxQuestions}
          correctCount={correctCount}
          mistakes={mistakes}
          maxMistakes={maxMistakes}
        />

        <ComposerGuide
          composer={composer}
          reaction={answer ? (answer.wasCorrect ? 'correct' : 'wrong') : 'idle'}
        />

        <section className="player-panel" aria-label="Phrase playback">
          <div className={answer ? 'player-actions player-actions--answered' : 'player-actions'}>
            <button
              type="button"
              className={answer ? 'button button--secondary' : 'button button--primary'}
              onClick={handlePlay}
              disabled={isPlaying}
              aria-label="Play phrase"
            >
              {isPlaying ? 'Playing...' : 'Play melody'}
            </button>
            {answer ? (
              <button
                type="button"
                className="button button--primary"
                onClick={handleNextQuestion}
                aria-label="Next question"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="button button--secondary"
                onClick={handlePlay}
                disabled={isPlaying}
                aria-label="Play phrase again"
              >
                Play again
              </button>
            )}
          </div>
          <p
            className={`feedback ${
              answer ? (answer.wasCorrect ? 'feedback--correct' : 'feedback--wrong') : ''
            }`}
            aria-live="polite"
          >
            {feedback}
          </p>
        </section>

        <section className="options" aria-label="Answer options">
          {question.options.map((option, index) => {
            const isCorrectOption = index === question.correctOptionIndex
            const isSelectedWrong = answer?.selectedIndex === index && !answer.wasCorrect
            const state = answer
              ? isCorrectOption
                ? 'correct'
                : isSelectedWrong
                  ? 'wrong'
                  : 'idle'
              : 'idle'

            return (
              <ScoreOption
                key={`${question.id}-${getOptionKey(option)}`}
                score={getOptionScore(option, question)}
                optionNumber={index + 1}
                state={state}
                disabled={Boolean(answer)}
                onSelect={() => handleAnswer(index)}
              />
            )
          })}
        </section>

      </section>
    </main>
  )
}

function TextAnswerExerciseSession<
  TQuestion extends { id: string; options: TOption[]; correctOptionIndex: number },
  TOption,
>({
  title,
  description,
  idlePrompt,
  createQuestion,
  getOptionKey,
  getOptionLabel,
  playTarget,
  composer,
  instrument,
  onBackHome,
}: {
  title: string
  description: string
  idlePrompt: string
  createQuestion: () => TQuestion
  getOptionKey: (option: TOption) => string
  getOptionLabel: (option: TOption) => string
  playTarget: (question: TQuestion, instrument: Instrument) => Promise<void>
  composer: ComposerId
  instrument: Instrument
  onBackHome: () => void
}) {
  const [question, setQuestion] = useState<TQuestion>(() => createQuestion())
  const [questionNumber, setQuestionNumber] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [answer, setAnswer] = useState<AnswerState | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

  const feedback = useMemo(() => {
    if (!answer) {
      return idlePrompt
    }

    return answer.wasCorrect ? 'Correct' : 'Not quite'
  }, [answer, idlePrompt])

  async function handlePlay() {
    setIsPlaying(true)

    try {
      await playTarget(question, instrument)
    } finally {
      setIsPlaying(false)
    }
  }

  function handleAnswer(selectedIndex: number) {
    const currentQuestion = question

    if (answer || !currentQuestion) {
      return
    }

    const wasCorrect = selectedIndex === currentQuestion.correctOptionIndex
    const nextMistakes = wasCorrect ? mistakes : mistakes + 1
    const nextCorrectCount = wasCorrect ? correctCount + 1 : correctCount

    setAnswer({ selectedIndex, wasCorrect })
    setCorrectCount(nextCorrectCount)
    setMistakes(nextMistakes)

    if (nextMistakes >= maxMistakes || questionNumber >= maxQuestions) {
      setIsFinished(true)
    }
  }

  function handleNextQuestion() {
    setQuestion(createQuestion())
    setQuestionNumber((current) => current + 1)
    setAnswer(null)
  }

  function handleReset() {
    setQuestion(createQuestion())
    setQuestionNumber(1)
    setCorrectCount(0)
    setMistakes(0)
    setAnswer(null)
    setIsFinished(false)
    setIsPlaying(false)
  }

  if (isFinished && answer) {
    const endedEarly = mistakes >= maxMistakes

    return (
      <main className="app-shell">
        <section className="result-panel" aria-labelledby="result-title">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <h1 id="result-title">Result</h1>
          <p>
            You answered {correctCount} out of {questionNumber} question
            {questionNumber === 1 ? '' : 's'} correctly.
          </p>
          <p>{endedEarly ? 'The exercise ended after three mistakes.' : 'You reached question 10.'}</p>
          <button type="button" className="button button--primary" onClick={handleReset}>
            Play again
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="exercise" aria-labelledby="app-title">
        <header className="app-header app-header--with-back">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <div>
            <h1 id="app-title">{title}</h1>
            <p>
              {description} Playing with {INSTRUMENT_LABELS[instrument].toLowerCase()}.
            </p>
          </div>
        </header>

        <StatusBar
          questionNumber={questionNumber}
          totalQuestions={maxQuestions}
          correctCount={correctCount}
          mistakes={mistakes}
          maxMistakes={maxMistakes}
        />

        <ComposerGuide
          composer={composer}
          reaction={answer ? (answer.wasCorrect ? 'correct' : 'wrong') : 'idle'}
        />

        <section className="player-panel" aria-label="Interval playback">
          <div className={answer ? 'player-actions player-actions--answered' : 'player-actions'}>
            <button
              type="button"
              className={answer ? 'button button--secondary' : 'button button--primary'}
              onClick={handlePlay}
              disabled={isPlaying}
              aria-label="Play interval"
            >
              {isPlaying ? 'Playing...' : 'Play interval'}
            </button>
            {answer ? (
              <button
                type="button"
                className="button button--primary"
                onClick={handleNextQuestion}
                aria-label="Next question"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="button button--secondary"
                onClick={handlePlay}
                disabled={isPlaying}
                aria-label="Play interval again"
              >
                Play again
              </button>
            )}
          </div>
          <p
            className={`feedback ${
              answer ? (answer.wasCorrect ? 'feedback--correct' : 'feedback--wrong') : ''
            }`}
            aria-live="polite"
          >
            {feedback}
          </p>
        </section>

        <section className="interval-options" aria-label="Answer options">
          {question.options.map((option, index) => {
            const isCorrectOption = index === question.correctOptionIndex
            const isSelectedWrong = answer?.selectedIndex === index && !answer.wasCorrect
            const stateClass = answer
              ? isCorrectOption
                ? 'interval-option--correct'
                : isSelectedWrong
                  ? 'interval-option--wrong'
                  : ''
              : ''

            return (
              <button
                key={`${question.id}-${getOptionKey(option)}`}
                type="button"
                className={`interval-option ${stateClass}`}
                disabled={Boolean(answer)}
                onClick={() => handleAnswer(index)}
                aria-label={`Option ${index + 1}: ${getOptionLabel(option)}`}
              >
                {getOptionLabel(option)}
              </button>
            )
          })}
        </section>
      </section>
    </main>
  )
}

function RecognizePitchesExercise({
  instrument,
  onBackHome,
}: {
  instrument: Instrument
  onBackHome: () => void
}) {
  return (
    <ExerciseSession<Question, Melody>
      title="Recognize pitches"
      description="Match the melody you hear to the score."
      idlePrompt="Listen once, then choose the matching score."
      createQuestion={generateQuestion}
      getOptionKey={melodyKey}
      getOptionScore={(melody) => ({ melody })}
      playTarget={(question, selectedInstrument) => playMelody(question.target, selectedInstrument)}
      composer="bach"
      instrument={instrument}
      onBackHome={onBackHome}
    />
  )
}

function RecognizePitchesTwoExercise({
  instrument,
  onBackHome,
}: {
  instrument: Instrument
  onBackHome: () => void
}) {
  return (
    <ExerciseSession<ChromaticQuestion, Melody>
      title="Recognize pitches 2"
      description="Match the chromatic melody you hear to the score."
      idlePrompt="Listen for sharps and flats, then choose the matching score."
      createQuestion={generateChromaticQuestion}
      getOptionKey={melodyKey}
      getOptionScore={(melody, question) => ({ melody, accidentalMode: question.accidentalMode })}
      playTarget={(question, selectedInstrument) => playMelody(question.target, selectedInstrument)}
      composer="beethoven"
      instrument={instrument}
      onBackHome={onBackHome}
    />
  )
}

function RecognizePitchesThreeExercise({
  instrument,
  onBackHome,
}: {
  instrument: Instrument
  onBackHome: () => void
}) {
  return (
    <ExerciseSession<QuarterToneQuestion, QuarterToneMelody>
      title="Recognize pitches 3"
      description="Match the quarter-tone melody you hear to the score."
      idlePrompt="Listen for koron, sori, sharps, and flats, then choose the matching score."
      createQuestion={generateQuarterToneQuestion}
      getOptionKey={quarterToneMelodyKey}
      getOptionScore={(quarterToneMelody) => ({ quarterToneMelody })}
      playTarget={(question, selectedInstrument) =>
        playQuarterToneMelody(question.target, selectedInstrument)
      }
      composer="bach"
      instrument={instrument}
      onBackHome={onBackHome}
    />
  )
}

function RecognizeOrnamentsExercise({
  instrument,
  onBackHome,
}: {
  instrument: Instrument
  onBackHome: () => void
}) {
  return (
    <ExerciseSession<OrnamentQuestion, OrnamentedMelody>
      title="Recognize ornaments"
      description="Each score has the same notes. Choose the ornament you hear."
      idlePrompt="Listen for the ornament, then choose the matching score."
      createQuestion={generateOrnamentQuestion}
      getOptionKey={(option) => `${option.ornament.noteIndex}-${option.ornament.kind}`}
      getOptionScore={(option) => option}
      playTarget={(question, selectedInstrument) => playOrnamentedMelody(question.target, selectedInstrument)}
      composer="mozart"
      instrument={instrument}
      onBackHome={onBackHome}
    />
  )
}

function RecognizeRhythmsExercise({
  instrument,
  onBackHome,
}: {
  instrument: Instrument
  onBackHome: () => void
}) {
  return (
    <ExerciseSession<RhythmQuestion, RhythmPhrase>
      title="Recognize rhythms"
      description="Choose the rhythm you hear."
      idlePrompt="Listen for note lengths and rests, then choose the matching rhythm."
      createQuestion={generateRhythmQuestion}
      getOptionKey={rhythmPhraseKey}
      getOptionScore={(rhythmPhrase) => ({ rhythmPhrase })}
      playTarget={(question, selectedInstrument) => playRhythmPhrase(question.target, selectedInstrument)}
      composer="chopin"
      instrument={instrument}
      onBackHome={onBackHome}
    />
  )
}

function RecognizeIntervalsExercise({
  instrument,
  onBackHome,
}: {
  instrument: Instrument
  onBackHome: () => void
}) {
  return (
    <TextAnswerExerciseSession<IntervalQuestion, IntervalOption>
      title="Recognize intervals"
      description="Hear one note followed by another and name the interval size."
      idlePrompt="Listen to the two notes, then choose the interval size."
      createQuestion={generateIntervalQuestion}
      getOptionKey={intervalOptionKey}
      getOptionLabel={(option) => option.label}
      playTarget={(question, selectedInstrument) =>
        playInterval(question.tonic, question.targetNote, selectedInstrument)
      }
      composer="beethoven"
      instrument={instrument}
      onBackHome={onBackHome}
    />
  )
}

function ScoreMatchExercise({ onBackHome }: { onBackHome: () => void }) {
  const [selectedPieceId, setSelectedPieceId] = useState<ClassicalPieceId | null>(null)
  const [barSession, setBarSession] = useState<ClassicalBarExerciseState | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [answer, setAnswer] = useState<AnswerState | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const question = barSession?.question ?? null
  const selectedPiece = classicalPieces.find((piece) => piece.id === selectedPieceId) ?? null
  const feedback = useMemo(() => {
    if (!answer) {
      return 'Listen to the bar, then choose the matching score.'
    }

    return answer.wasCorrect ? 'Correct' : 'Not quite'
  }, [answer])

  useEffect(() => {
    return () => {
      stopAudioSource(sourceRef.current)
    }
  }, [])

  async function handlePlay() {
    if (!question) {
      return
    }

    setIsPlaying(true)
    setPlaybackError(null)
    stopAudioSource(sourceRef.current)

    try {
      const clip = await loadClassicalClip(question.target)
      const source = clip.context.createBufferSource()
      const offsetSeconds = clip.audibleStartSeconds + classicalBarOffset(question.target)

      if (clip.context.state !== 'running') {
        await clip.context.resume()
      }

      source.buffer = clip.buffer
      source.connect(clip.context.destination)
      sourceRef.current = source
      source.start(clip.context.currentTime, offsetSeconds, question.target.barSeconds)

      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(() => {
          resolve()
        }, question.target.barSeconds * 1000)

        source.addEventListener(
          'ended',
          () => {
            window.clearTimeout(timeout)
            resolve()
          },
          { once: true },
        )
      })
    } catch {
      setPlaybackError('The recording could not be played.')
    } finally {
      setIsPlaying(false)
    }
  }

  function handleAnswer(selectedIndex: number) {
    if (answer || !question) {
      return
    }

    const wasCorrect = selectedIndex === question.correctOptionIndex
    setAnswer({ selectedIndex, wasCorrect })
    setCorrectCount((current) => (wasCorrect ? current + 1 : current))
    setMistakes((current) => (wasCorrect ? current : current + 1))

    if (questionNumber >= maxQuestions) {
      setIsFinished(true)
    }
  }

  function handleNextQuestion() {
    if (!selectedPieceId || !barSession) {
      return
    }

    const nextQuestionNumber = questionNumber + 1
    setQuestionNumber(nextQuestionNumber)
    setBarSession((current) => ({
      ...current!,
      question: createClassicalBarQuestion(
        current!.questionOrder[nextQuestionNumber - 1],
        barsByPiece[selectedPieceId],
      ),
    }))
    setAnswer(null)
  }

  function handleReset() {
    if (!selectedPieceId) {
      return
    }

    setBarSession(createClassicalBarExerciseState(selectedPieceId))
    setQuestionNumber(1)
    setCorrectCount(0)
    setMistakes(0)
    setAnswer(null)
    setIsFinished(false)
    setIsPlaying(false)
    setPlaybackError(null)
    stopAudioSource(sourceRef.current)
  }

  function handleSelectPiece(pieceId: ClassicalPieceId) {
    setSelectedPieceId(pieceId)
    setBarSession(createClassicalBarExerciseState(pieceId))
    setQuestionNumber(1)
    setCorrectCount(0)
    setMistakes(0)
    setAnswer(null)
    setIsFinished(false)
    setIsPlaying(false)
    setPlaybackError(null)
    stopAudioSource(sourceRef.current)
  }

  if (!selectedPiece || !barSession || !question) {
    return (
      <main className="app-shell">
        <section className="exercise" aria-labelledby="app-title">
          <header className="app-header app-header--with-back">
            <button type="button" className="back-button" onClick={onBackHome}>
              Home
            </button>
            <div>
              <h1 id="app-title">Score vs recording</h1>
              <p>Choose one piece, then match bars from that piece only.</p>
            </div>
          </header>

          <section className="piece-options" aria-label="Choose a piece">
            {classicalPieces.map((piece) => (
              <button
                key={piece.id}
                type="button"
                className="piece-option"
                onClick={() => handleSelectPiece(piece.id)}
              >
                <span>{piece.title}</span>
                <small>{piece.composer === 'bach' ? 'Johann Sebastian Bach' : 'Ludwig van Beethoven'}</small>
              </button>
            ))}
          </section>
        </section>
      </main>
    )
  }

  if (isFinished && answer) {
    return (
      <main className="app-shell">
        <section className="result-panel" aria-labelledby="result-title">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <h1 id="result-title">Result</h1>
          <p>
            You matched {correctCount} out of {maxQuestions} bars correctly.
          </p>
          <button type="button" className="button button--primary" onClick={handleReset}>
            Play again
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="exercise" aria-labelledby="app-title">
        <header className="app-header app-header--with-back">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <div>
            <h1 id="app-title">Score vs recording</h1>
            <p>Hear one bar from {selectedPiece.title} and choose the matching score.</p>
          </div>
        </header>

        <StatusBar
          questionNumber={questionNumber}
          totalQuestions={maxQuestions}
          correctCount={correctCount}
          mistakes={mistakes}
          maxMistakes={maxQuestions}
        />

        <ComposerGuide
          composer={question.target.composer}
          reaction={answer ? (answer.wasCorrect ? 'correct' : 'wrong') : 'idle'}
        />

        <section className="player-panel" aria-label="Recording playback">
          <div className={answer ? 'player-actions player-actions--answered' : 'player-actions'}>
            <button
              type="button"
              className={answer ? 'button button--secondary' : 'button button--primary'}
              onClick={handlePlay}
              disabled={isPlaying}
              aria-label="Play bar recording"
            >
              {isPlaying ? 'Playing...' : 'Play recording'}
            </button>
            {answer ? (
              <button
                type="button"
                className="button button--primary"
                onClick={handleNextQuestion}
                aria-label="Next question"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="button button--secondary"
                onClick={handlePlay}
                disabled={isPlaying}
                aria-label="Play bar recording again"
              >
                Play again
              </button>
            )}
          </div>
          <p
            className={`feedback ${
              answer ? (answer.wasCorrect ? 'feedback--correct' : 'feedback--wrong') : ''
            }`}
            aria-live="polite"
          >
            {feedback}
            {playbackError ? ` ${playbackError}` : ''}
          </p>
        </section>

        <section className="bar-score-options" aria-label="Score answer options">
          {question.options.map((option, index) => {
            const isCorrect = index === question.correctOptionIndex
            const isWrongSelection = answer?.selectedIndex === index && !answer.wasCorrect
            const stateClass = answer
              ? isCorrect
                ? 'bar-score-option--correct'
                : isWrongSelection
                  ? 'bar-score-option--wrong'
                  : ''
              : ''

            return (
              <button
                key={`${question.id}-${option.id}`}
                type="button"
                className={`bar-score-option ${stateClass}`}
                onClick={() => handleAnswer(index)}
                disabled={Boolean(answer)}
                aria-label={`Option ${index + 1}`}
              >
                <span className="bar-score-option__label">Option {index + 1}</span>
                <MusicXmlOpeningScore src={option.scorePath} measureNumber={option.measureNumber} />
              </button>
            )
          })}
        </section>
      </section>
    </main>
  )
}

function ScrapedBarsExercise({ onBackHome }: { onBackHome: () => void }) {
  const [availableBars, setAvailableBars] = useState<ScrapedBar[]>([])
  const [barSession, setBarSession] = useState<ScrapedBarExerciseState | null>(null)
  const [questionNumber, setQuestionNumber] = useState(1)
  const [correctCount, setCorrectCount] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [answer, setAnswer] = useState<AnswerState | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const question = barSession?.question
  const feedback = useMemo(() => {
    if (!answer) {
      return 'Listen to the aligned bar, then choose the matching score.'
    }

    return answer.wasCorrect ? 'Correct' : 'Not quite'
  }, [answer])

  useEffect(() => {
    let isCancelled = false

    loadScrapedBars()
      .then((bars) => {
        if (isCancelled) {
          return
        }

        if (bars.length < maxQuestions) {
          throw new Error('Not enough aligned bars are available.')
        }

        setAvailableBars(bars)
        setBarSession(createScrapedBarExerciseState(bars))
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError('The aligned bars could not be loaded.')
        }
      })

    return () => {
      isCancelled = true
      stopAudioSource(sourceRef.current)
    }
  }, [])

  async function handlePlay() {
    if (!question) {
      return
    }

    setIsPlaying(true)
    setPlaybackError(null)
    stopAudioSource(sourceRef.current)

    try {
      const clip = await loadScrapedClip()
      const source = clip.context.createBufferSource()
      const durationSeconds = question.target.endSeconds - question.target.startSeconds

      if (clip.context.state !== 'running') {
        await clip.context.resume()
      }

      source.buffer = clip.buffer
      source.connect(clip.context.destination)
      sourceRef.current = source
      source.start(clip.context.currentTime, question.target.startSeconds, durationSeconds)

      await new Promise<void>((resolve) => {
        const timeout = window.setTimeout(() => {
          resolve()
        }, durationSeconds * 1000)

        source.addEventListener(
          'ended',
          () => {
            window.clearTimeout(timeout)
            resolve()
          },
          { once: true },
        )
      })
    } catch {
      setPlaybackError('The recording could not be played.')
    } finally {
      setIsPlaying(false)
    }
  }

  function handleAnswer(selectedIndex: number) {
    const currentQuestion = question

    if (answer || !currentQuestion) {
      return
    }

    const wasCorrect = selectedIndex === currentQuestion.correctOptionIndex
    setAnswer({ selectedIndex, wasCorrect })
    setCorrectCount((current) => (wasCorrect ? current + 1 : current))
    setMistakes((current) => (wasCorrect ? current : current + 1))

    if (questionNumber >= maxQuestions) {
      setIsFinished(true)
    }
  }

  function handleNextQuestion() {
    if (!barSession) {
      return
    }

    const nextQuestionNumber = questionNumber + 1
    setQuestionNumber(nextQuestionNumber)
    setBarSession((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        question: createScrapedBarQuestion(
          current.questionOrder[nextQuestionNumber - 1],
          availableBars,
        ),
      }
    })
    setAnswer(null)
  }

  function handleReset() {
    if (availableBars.length < 4) {
      return
    }

    setBarSession(createScrapedBarExerciseState(availableBars))
    setQuestionNumber(1)
    setCorrectCount(0)
    setMistakes(0)
    setAnswer(null)
    setIsFinished(false)
    setIsPlaying(false)
    setPlaybackError(null)
    stopAudioSource(sourceRef.current)
  }

  if (loadError) {
    return (
      <main className="app-shell">
        <section className="result-panel" aria-labelledby="load-error-title">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <h1 id="load-error-title">Scraped aligned bars</h1>
          <p>{loadError}</p>
        </section>
      </main>
    )
  }

  if (!question) {
    return (
      <main className="app-shell">
        <section className="result-panel" aria-labelledby="loading-title">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <h1 id="loading-title">Scraped aligned bars</h1>
          <p>Loading aligned bars...</p>
        </section>
      </main>
    )
  }

  if (isFinished && answer) {
    return (
      <main className="app-shell">
        <section className="result-panel" aria-labelledby="result-title">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <h1 id="result-title">Result</h1>
          <p>
            You matched {correctCount} out of {maxQuestions} aligned bars correctly.
          </p>
          <button type="button" className="button button--primary" onClick={handleReset}>
            Play again
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="exercise" aria-labelledby="app-title">
        <header className="app-header app-header--with-back">
          <button type="button" className="back-button" onClick={onBackHome}>
            Home
          </button>
          <div>
            <h1 id="app-title">Scraped aligned bars</h1>
            <p>Hear one aligned bar and choose the matching score.</p>
          </div>
        </header>

        <StatusBar
          questionNumber={questionNumber}
          totalQuestions={maxQuestions}
          correctCount={correctCount}
          mistakes={mistakes}
          maxMistakes={maxQuestions}
        />

        <ComposerGuide
          composer="beethoven"
          reaction={answer ? (answer.wasCorrect ? 'correct' : 'wrong') : 'idle'}
        />

        <section className="player-panel" aria-label="Aligned bar playback">
          <div className={answer ? 'player-actions player-actions--answered' : 'player-actions'}>
            <button
              type="button"
              className={answer ? 'button button--secondary' : 'button button--primary'}
              onClick={handlePlay}
              disabled={isPlaying}
              aria-label="Play aligned bar recording"
            >
              {isPlaying ? 'Playing...' : 'Play recording'}
            </button>
            {answer ? (
              <button
                type="button"
                className="button button--primary"
                onClick={handleNextQuestion}
                aria-label="Next question"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="button button--secondary"
                onClick={handlePlay}
                disabled={isPlaying}
                aria-label="Play aligned bar recording again"
              >
                Play again
              </button>
            )}
          </div>
          <p
            className={`feedback ${
              answer ? (answer.wasCorrect ? 'feedback--correct' : 'feedback--wrong') : ''
            }`}
            aria-live="polite"
          >
            {feedback}
            {playbackError ? ` ${playbackError}` : ''}
          </p>
        </section>

        <section className="bar-score-options" aria-label="Score answer options">
          {question.options.map((option, index) => {
            const isCorrect = index === question.correctOptionIndex
            const isWrongSelection = answer?.selectedIndex === index && !answer.wasCorrect
            const stateClass = answer
              ? isCorrect
                ? 'bar-score-option--correct'
                : isWrongSelection
                  ? 'bar-score-option--wrong'
                  : ''
              : ''

            return (
              <button
                key={`${question.id}-${option.measureNumber}`}
                type="button"
                className={`bar-score-option ${stateClass}`}
                onClick={() => handleAnswer(index)}
                disabled={Boolean(answer)}
                aria-label={`Option ${index + 1}`}
              >
                <span className="bar-score-option__label">Option {index + 1}</span>
                <MusicXmlOpeningScore
                  src={scrapedScorePath}
                  measureNumber={option.measureNumber}
                />
              </button>
            )
          })}
        </section>
      </section>
    </main>
  )
}

function App() {
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategoryId | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<ExerciseId | null>(null)
  const [instrument, setInstrument] = useState<Instrument>('piano')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  function handleBackHome() {
    setSelectedCategory(null)
    setSelectedExercise(null)
  }

  function renderScreen() {
    if (!selectedExercise) {
      if (selectedCategory) {
        return (
          <LevelMenuScreen
            categoryId={selectedCategory}
            onSelectExercise={setSelectedExercise}
            onBackHome={handleBackHome}
          />
        )
      }

      return <HomeScreen onSelectCategory={setSelectedCategory} />
    }

    if (selectedExercise === 'ornaments') {
      return <RecognizeOrnamentsExercise instrument={instrument} onBackHome={handleBackHome} />
    }

    if (selectedExercise === 'pitches-2') {
      return <RecognizePitchesTwoExercise instrument={instrument} onBackHome={handleBackHome} />
    }

    if (selectedExercise === 'pitches-3') {
      return <RecognizePitchesThreeExercise instrument={instrument} onBackHome={handleBackHome} />
    }

    if (selectedExercise === 'rhythms') {
      return <RecognizeRhythmsExercise instrument={instrument} onBackHome={handleBackHome} />
    }

    if (selectedExercise === 'intervals') {
      return <RecognizeIntervalsExercise instrument={instrument} onBackHome={handleBackHome} />
    }

    if (selectedExercise === 'score-match') {
      return <ScoreMatchExercise onBackHome={handleBackHome} />
    }

    if (selectedExercise === 'scraped-bars') {
      return <ScrapedBarsExercise onBackHome={handleBackHome} />
    }

    return <RecognizePitchesExercise instrument={instrument} onBackHome={handleBackHome} />
  }

  return (
    <>
      <SettingsMenu
        instrument={instrument}
        isOpen={isSettingsOpen}
        onInstrumentChange={setInstrument}
        onOpen={() => setIsSettingsOpen(true)}
        onClose={() => setIsSettingsOpen(false)}
      />
      {renderScreen()}
    </>
  )
}

export default App
