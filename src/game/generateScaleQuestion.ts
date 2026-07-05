import type {
  NamedScaleOption,
  NamedScaleQuestion,
  ScaleOption,
  ScaleQuestion,
  ScaleQuality,
} from './types'

type RandomSource = () => number

const SCALE_PATTERNS: Record<ScaleQuality, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
}

const SCALE_TONICS = [
  { midiNote: 60, name: 'Do' },
  { midiNote: 62, name: 'Re' },
  { midiNote: 64, name: 'Mi' },
  { midiNote: 65, name: 'Fa' },
  { midiNote: 67, name: 'Sol' },
  { midiNote: 69, name: 'La' },
  { midiNote: 71, name: 'Ti' },
]

export const SCALE_OPTIONS: ScaleOption[] = [
  { quality: 'major', label: 'Major' },
  { quality: 'minor', label: 'Minor' },
]

function randomInt(max: number, random: RandomSource) {
  return Math.floor(random() * max)
}

function shuffle<T>(items: T[], random: RandomSource) {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1, random)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!]
  }

  return shuffled
}

function scaleFor(tonic: number, quality: ScaleQuality) {
  return SCALE_PATTERNS[quality].map((interval) => tonic + interval)
}

function scaleUpAndDown(tonic: number, quality: ScaleQuality) {
  const ascendingScale = scaleFor(tonic, quality)

  return [...ascendingScale, ...ascendingScale.slice(0, -1).reverse()]
}

function scaleNameOption(tonic: (typeof SCALE_TONICS)[number], quality: ScaleQuality) {
  return {
    tonic: tonic.midiNote,
    tonicName: tonic.name,
    label: `${tonic.name} ${quality}`,
    quality,
  } satisfies NamedScaleOption
}

export function scaleOptionKey(option: ScaleOption) {
  return option.quality
}

export function generateScaleQuestion(random: RandomSource = Math.random): ScaleQuestion {
  const target = SCALE_OPTIONS[randomInt(SCALE_OPTIONS.length, random)]!
  const tonic = 60
  const scale = scaleUpAndDown(tonic, target.quality)

  return {
    id: crypto.randomUUID(),
    tonic,
    scale,
    target,
    options: SCALE_OPTIONS,
    correctOptionIndex: SCALE_OPTIONS.findIndex((option) => option.quality === target.quality),
  }
}

export function namedScaleOptionKey(option: NamedScaleOption) {
  return `${option.tonicName}-${option.quality}`
}

export function generateNamedScaleQuestion(
  random: RandomSource = Math.random,
): NamedScaleQuestion {
  const tonic = SCALE_TONICS[randomInt(SCALE_TONICS.length, random)]!
  const quality = SCALE_OPTIONS[randomInt(SCALE_OPTIONS.length, random)]!.quality
  const target = scaleNameOption(tonic, quality)
  const usedOptionKeys = new Set([namedScaleOptionKey(target)])
  const distractors: NamedScaleOption[] = []
  const candidates = shuffle(
    SCALE_TONICS.flatMap((candidateTonic) =>
      SCALE_OPTIONS.map((candidateQuality) =>
        scaleNameOption(candidateTonic, candidateQuality.quality),
      ),
    ),
    random,
  )

  for (const candidate of candidates) {
    if (distractors.length >= 3) {
      break
    }

    const candidateKey = namedScaleOptionKey(candidate)
    if (usedOptionKeys.has(candidateKey)) {
      continue
    }

    usedOptionKeys.add(candidateKey)
    distractors.push(candidate)
  }

  const options = shuffle([target, ...distractors], random)

  return {
    id: crypto.randomUUID(),
    scale: scaleUpAndDown(tonic.midiNote, quality),
    target,
    options,
    correctOptionIndex: options.findIndex(
      (option) => namedScaleOptionKey(option) === namedScaleOptionKey(target),
    ),
  }
}
