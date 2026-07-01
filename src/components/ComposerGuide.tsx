export type ComposerReaction = 'idle' | 'correct' | 'wrong'

export type ComposerId = 'bach' | 'beethoven' | 'mozart' | 'chopin'

type ComposerGuideProps = {
  composer: ComposerId
  reaction: ComposerReaction
}

const composerDetails: Record<
  ComposerId,
  {
    name: string
    role: string
    portrait: string
  }
> = {
  bach: {
    name: 'Bach',
    role: 'counterpoint coach',
    portrait: '/composers/bach.png',
  },
  beethoven: {
    name: 'Beethoven',
    role: 'stormy examiner',
    portrait: '/composers/beethoven.png',
  },
  mozart: {
    name: 'Mozart',
    role: 'bright-eyed tutor',
    portrait: '/composers/mozart.png',
  },
  chopin: {
    name: 'Chopin',
    role: 'lyrical listener',
    portrait: '/composers/chopin.png',
  },
}

export function ComposerGuide({ composer, reaction }: ComposerGuideProps) {
  const details = composerDetails[composer]
  const message =
    reaction === 'correct'
      ? 'Splendid.'
      : reaction === 'wrong'
        ? 'Listen again.'
        : 'I am listening.'

  return (
    <aside className={`composer-guide composer-guide--${reaction}`} aria-label={`${details.name} guide`}>
      <img className="composer-guide__portrait" src={details.portrait} alt="" aria-hidden="true" />
      <div className="composer-guide__text">
        <strong>{details.name}</strong>
        <span>{details.role}</span>
        <em aria-live="polite">{message}</em>
      </div>
    </aside>
  )
}
