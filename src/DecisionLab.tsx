import { useEffect, useState } from 'react';
import { ArrowRight, Check, Compass, RotateCcw, X } from 'lucide-react';
import type { DecisionLab as DecisionLabContent } from './content';
import { ensurePracticeStarted, recordPracticeCompleted } from './practice-progress';

type DecisionLabProps = {
  lab: DecisionLabContent;
  lessonId: string;
};

export default function DecisionLab({ lab, lessonId }: DecisionLabProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const activityId = `${lessonId}-decision`;

  useEffect(() => {
    setSelected(null);
    ensurePracticeStarted('decisionLabs', activityId);
  }, [activityId, lessonId]);

  const selectedOption = selected === null ? null : lab.options[selected];

  const selectOption = (index: number) => {
    setSelected(index);
    if (lab.options[index]?.correct) recordPracticeCompleted('decisionLabs', activityId);
  };

  return (
    <section className="decision-section">
      <div className="section-heading compact">
        <div>
          <p className="eyebrow">04 · ARCHITECTURE DECISION LAB</p>
          <h2>Choose the boundary, not the buzzword</h2>
          <p>Make a production decision, then compare the consequences.</p>
        </div>
      </div>

      <div className="decision-panel">
        <div className="decision-brief">
          <div className="decision-icon"><Compass size={22} /></div>
          <p className="overline">SCENARIO</p>
          <h3>{lab.title}</h3>
          <p>{lab.scenario}</p>
          <div className="decision-question"><ArrowRight size={16} /><strong>{lab.question}</strong></div>
        </div>

        <div className="decision-options">
          {lab.options.map((option, index) => {
            const chosen = selected === index;
            const revealed = selected !== null;
            const state = revealed && option.correct ? 'correct' : revealed && chosen ? 'wrong' : '';
            return (
              <button key={option.label} className={`${chosen ? 'chosen' : ''} ${state}`} onClick={() => selectOption(index)}>
                <span className="decision-choice">
                  {revealed && option.correct ? <Check size={15} /> : revealed && chosen ? <X size={15} /> : String.fromCharCode(65 + index)}
                </span>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedOption && (
        <div className={`decision-feedback ${selectedOption.correct ? 'correct' : 'wrong'}`}>
          <div>{selectedOption.correct ? <Check size={18} /> : <X size={18} />}</div>
          <p><strong>{selectedOption.correct ? 'Strong decision.' : 'Reconsider the boundary.'}</strong> {selectedOption.feedback}</p>
          {!selectedOption.correct && <button onClick={() => setSelected(null)}><RotateCcw size={14} /> Try another</button>}
        </div>
      )}

      {selectedOption?.correct && <div className="decision-takeaway"><span>REVIEW RULE</span><p>{lab.takeaway}</p></div>}
    </section>
  );
}
