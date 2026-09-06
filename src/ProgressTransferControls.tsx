import { useRef, useState, type ChangeEvent } from 'react';
import { Download, Upload, XCircle } from 'lucide-react';
import type { LearnerProgress } from './progress';
import {
  confirmLearnerProgressImport,
  exportLearnerProgress,
  previewLearnerProgressImport,
  type ImportPreview,
} from './progress-store';

type ProgressTransferControlsProps = {
  progress: LearnerProgress;
  onReplace: (progress: LearnerProgress) => void;
};

export default function ProgressTransferControls({ progress, onReplace }: ProgressTransferControlsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportProgress = () => {
    const blob = new Blob([exportLearnerProgress(progress)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'reviewlab-progress.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const selectImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const nextPreview = previewLearnerProgressImport(await file.text());
    if (!nextPreview.replacement || !nextPreview.summary) {
      setPreview(null);
      setError(nextPreview.result.status === 'recovery-required'
        ? nextPreview.result.reason
        : 'The selected file does not contain importable ReviewLab progress.');
      return;
    }

    setError(null);
    setPreview(nextPreview);
  };

  const confirmImport = () => {
    if (!preview) return;
    const replacement = confirmLearnerProgressImport(localStorage, preview);
    onReplace(replacement);
    setPreview(null);
    setError(null);
  };

  return (
    <section aria-label="Progress backup" className="progress-transfer">
      <div className="progress-transfer-actions">
        <button className="reset-button" onClick={exportProgress} type="button">
          <Download size={15} /> Export progress
        </button>
        <button className="reset-button" onClick={() => inputRef.current?.click()} type="button">
          <Upload size={15} /> Import progress
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          aria-label="Select ReviewLab progress JSON to import"
          onChange={(event) => void selectImport(event)}
          hidden
        />
      </div>

      {error && (
        <div className="import-preview" role="alert">
          <XCircle size={16} />
          <p><strong>Import not applied.</strong> {error}</p>
        </div>
      )}

      {preview?.summary && (
        <div className="import-preview" role="status">
          <strong>Replace current progress with this export?</strong>
          <p>
            {preview.summary.completedLessons} completed lessons · {preview.summary.submittedReviews} submitted reviews ·{' '}
            {preview.summary.completedPracticeActivities} completed practice activities
          </p>
          <p>
            Baseline: {preview.summary.baselineStatus} · Post: {preview.summary.postStatus} · Capstone: {preview.summary.capstoneStage}
          </p>
          <div className="progress-transfer-actions">
            <button className="secondary-button" type="button" onClick={confirmImport}>Confirm replacement</button>
            <button className="reset-button" type="button" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
