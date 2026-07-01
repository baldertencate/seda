import { useMemo, useState } from 'react'
import { playMelody, playOrnamentedMelody, playRhythmPhrase } from './audio/playMelody'
import { INSTRUMENT_LABELS, type Instrument } from './audio/types'
import { ComposerGuide, type ComposerId } from './components/ComposerGuide'
import { ScoreOption, type ScoreOptionScore } from './components/ScoreOption'
import { StatusBar } from './components/StatusBar'
import { generateChromaticQuestion, type ChromaticQuestion } from './game/generateChromaticQuestion'
import { generateOrnamentQuestion } from './game/generateOrnamentQuestion'
import { generateQuestion } from './game/generateQuestion'
import { generateRhythmQuestion, rhythmPhraseKey } from './game/generateRhythmQuestion'
import { melodyKey } from './game/music'
import type {
  Melody,
  OrnamentQuestion,
  OrnamentedMelody,
  Question,
  RhythmPhrase,
  RhythmQuestion,
} from './game/types'
import './styles.css'

const maxQuestions = 10
const maxMistakes = 3

type ExerciseId = 'pitches' | 'pitches-2' | 'ornaments' | 'rhythms'
type ExerciseCategoryId = 'pitches' | 'ornaments' | 'rhythms'

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
}

function InstrumentSelector({ instrument, onChange }: InstrumentSelectorProps) {
  return (
    <fieldset className="instrument-selector" aria-label="Instrument">
      <legend>Instrument</legend>
      {(['piano', 'flute'] as const).map((option) => (
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
              className="exercise-card"
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
              className="exercise-card level-card"
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
    if (answer) {
      return
    }

    const wasCorrect = selectedIndex === question.correctOptionIndex
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
          <div className="player-actions">
            <button
              type="button"
              className="button button--primary"
              onClick={handlePlay}
              disabled={isPlaying}
              aria-label="Play phrase"
            >
              {isPlaying ? 'Playing...' : 'Play melody'}
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={handlePlay}
              disabled={isPlaying}
              aria-label="Play phrase again"
            >
              Play again
            </button>
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

        {answer ? (
          <div className="next-row">
            <button type="button" className="button" onClick={handleNextQuestion}>
              Next question
            </button>
          </div>
        ) : null}
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

    if (selectedExercise === 'rhythms') {
      return <RecognizeRhythmsExercise instrument={instrument} onBackHome={handleBackHome} />
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
