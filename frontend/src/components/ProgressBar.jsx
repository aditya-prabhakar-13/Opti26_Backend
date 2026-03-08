import { useEffect } from 'react';

function getStageStatus(currentStage, targetStage) {
  const priority = { setup: 1, parsing: 2, routing: 3, optimizing: 4, processing: 5, saving: 6, complete: 7 };
  const current = priority[currentStage] || 0;
  const target = priority[targetStage] || 0;
  if (current > target) return 'completed';
  if (current === target) return 'active';
  return 'pending';
}

export default function ProgressBar({ progress, isVisible, onComplete }) {
  useEffect(() => {
    if (isVisible && progress.percentage === 100 && onComplete) {
      onComplete();
    }
  }, [isVisible, progress.percentage, onComplete]);

  if (!isVisible) return null;

  const stageMessages = {
    starting:   'Initializing…',
    setup:      'Setting up directories…',
    parsing:    'Parsing Excel file…',
    routing:    'Calculating road distances…',
    optimizing: 'Running optimization algorithm…',
    processing: 'Processing results…',
    saving:     'Saving results…',
    complete:   'Complete!',
  };

  const message = stageMessages[progress.stage] || progress.message || 'Processing…';
  const percentage = progress.percentage || 0;
  const stages = ['Parsing', 'Routing', 'Optimizing', 'Saving'];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(3px)',
      fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border-2)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        width: '90%',
        maxWidth: '420px',
        overflow: 'hidden',
        animation: 'slideUp 0.25s cubic-bezier(0.16,1,0.3,1)',
      }}>
        {/* Header strip */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          {/* Spinner */}
          <div style={{
            width: '16px', height: '16px', borderRadius: '50%',
            border: '2px solid var(--color-border-2)',
            borderTopColor: 'var(--color-accent)',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }} />
          <h3 style={{
            margin: 0,
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            letterSpacing: '-0.01em',
          }}>
            Optimization in Progress
          </h3>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Message */}
          <p style={{
            margin: '0 0 16px',
            fontSize: '0.8125rem',
            color: 'var(--color-text-2)',
            minHeight: '20px',
          }}>
            {message}
          </p>

          {/* Progress bar */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div style={{
              height: '6px',
              borderRadius: '3px',
              background: 'var(--color-border-2)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${percentage}%`,
                background: 'var(--color-accent)',
                borderRadius: '3px',
                transition: 'width 0.3s ease-out',
              }} />
            </div>
            <span style={{
              position: 'absolute',
              right: 0,
              top: '-22px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-text-2)',
            }}>
              {Math.round(percentage)}%
            </span>
          </div>

          {/* Stage indicators */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '8px',
          }}>
            {stages.map((stage, idx) => {
              const status = getStageStatus(progress.stage, stage.toLowerCase());
              return (
                <div key={idx} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  flex: 1,
                }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: status === 'completed' ? 'var(--color-green)'
                      : status === 'active' ? 'var(--color-accent)'
                      : 'var(--color-border-2)',
                    transition: 'background 0.3s ease',
                    boxShadow: status === 'active' ? `0 0 6px var(--color-accent)` : 'none',
                  }} />
                  <span style={{
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    color: status === 'completed' ? 'var(--color-green)'
                      : status === 'active' ? 'var(--color-accent)'
                      : 'var(--color-text-3)',
                    transition: 'color 0.3s ease',
                  }}>
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--color-border)',
          textAlign: 'center',
        }}>
          <p style={{
            margin: 0,
            fontSize: '0.6875rem',
            color: 'var(--color-text-3)',
          }}>
            Please don't close this window or refresh the page
          </p>
        </div>
      </div>
    </div>
  );
}
