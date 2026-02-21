import React, { useEffect } from 'react';
import './ProgressBar.css';

export default function ProgressBar({ progress, isVisible, onComplete }) {
  useEffect(() => {
    if (isVisible && progress.percentage === 100 && onComplete) {
      onComplete();
    }
  }, [isVisible, progress.percentage, onComplete]);

  if (!isVisible) return null;

  const stageMessages = {
    starting: '🚀 Initializing...',
    setup: '📁 Setting up directories...',
    parsing: '📊 Parsing Excel file...',
    routing: '🗺️ Calculating road distances...',
    optimizing: '⚙️ Running optimization algorithm...',
    processing: '📈 Processing results...',
    saving: '💾 Saving to database...',
    complete: '✅ Complete!',
  };

  const message = stageMessages[progress.stage] || progress.message || 'Processing...';
  const percentage = progress.percentage || 0;

  return (
    <div className="progress-overlay">
      <div className="progress-container">
        <div className="progress-header">
          <h3>Optimization in Progress</h3>
        </div>
        
        <div className="progress-content">
          <div className="progress-message">{message}</div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-background">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${percentage}%` }}
              >
                <div className="progress-bar-animated"></div>
              </div>
            </div>
            <div className="progress-percentage">{Math.round(percentage)}%</div>
          </div>

          <div className="progress-stages">
            {['Parsing', 'Routing', 'Optimizing', 'Saving'].map((stage, idx) => (
              <div key={idx} className={`stage ${getStageStatus(progress.stage, stage.toLowerCase())}`}>
                <div className="stage-dot"></div>
                <span className="stage-label">{stage}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="progress-footer">
          <p className="progress-hint">Please don't close this window or refresh the page</p>
        </div>
      </div>
    </div>
  );
}

function getStageStatus(currentStage, targetStage) {
  const stagePriority = {
    'setup': 1,
    'parsing': 2,
    'routing': 3,
    'optimizing': 4,
    'processing': 5,
    'saving': 6,
    'complete': 7,
  };

  const current = stagePriority[currentStage] || 0;
  const target = stagePriority[targetStage] || 0;

  if (current > target) return 'completed';
  if (current === target) return 'active';
  return 'pending';
}
