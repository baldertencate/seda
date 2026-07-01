export type ComposerReaction = 'idle' | 'correct' | 'wrong'

export type ComposerId = 'bach' | 'beethoven' | 'mozart' | 'chopin'

type ComposerGuideProps = {
  composer: ComposerId
  reaction: ComposerReaction
}

const assetPath = (path: string) => `${import.meta.env.BASE_URL}${path}`

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
    portrait: assetPath('composers/bach.png'),
  },
  beethoven: {
    name: 'Beethoven',
    role: 'stormy examiner',
    portrait: assetPath('composers/beethoven.png'),
  },
  mozart: {
    name: 'Mozart',
    role: 'bright-eyed tutor',
    portrait: assetPath('composers/mozart.png'),
  },
  chopin: {
    name: 'Chopin',
    role: 'lyrical listener',
    portrait: assetPath('composers/chopin.png'),
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
