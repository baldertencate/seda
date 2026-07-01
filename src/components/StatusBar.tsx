type StatusBarProps = {
  questionNumber: number
  totalQuestions: number
  correctCount: number
  mistakes: number
  maxMistakes: number
}

export function StatusBar({
  questionNumber,
  totalQuestions,
  correctCount,
  mistakes,
  maxMistakes,
}: StatusBarProps) {
  return (
    <section className="status-bar" aria-label="Exercise progress">
      <div>
        <span>Question</span>
        <strong>
          {questionNumber} / {totalQuestions}
        </strong>
      </div>
      <div>
        <span>Correct</span>
        <strong>{correctCount}</strong>
      </div>
      <div>
        <span>Mistakes</span>
        <strong>
          {mistakes} / {maxMistakes}
        </strong>
      </div>
    </section>
  )
}
