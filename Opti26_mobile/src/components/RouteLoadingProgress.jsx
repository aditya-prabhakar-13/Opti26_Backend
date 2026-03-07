import React from 'react';
import './RouteLoadingProgress.css';

export default function RouteLoadingProgress({ loaded, total, isVisible }) {
  if (!isVisible || total === 0) return null;

  const percentage = Math.round((loaded / total) * 100);

  return (
    <div className="route-progress-container">
      <div className="route-progress-content">
        <div className="route-progress-header">
          <span className="route-progress-title">🗺️ Loading road routes</span>
          <span className="route-progress-count">{loaded}/{total}</span>
        </div>
        
        <div className="route-progress-bar-wrapper">
          <div className="route-progress-bar-bg">
            <div 
              className="route-progress-bar-fill" 
              style={{ width: `${percentage}%` }}
            >
              <div className="route-progress-shimmer"></div>
            </div>
          </div>
          <span className="route-progress-percentage">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}
