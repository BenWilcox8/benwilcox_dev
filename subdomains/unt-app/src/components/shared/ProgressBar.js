import React from 'react';
import './ProgressBar.css';

// The fill is scaled, not resized. A width transition is laid out on the main
// thread, so it freezes wherever it has got to when the work after the
// download takes that thread for a few hundred milliseconds - the reader is
// left looking at a bar part-way to the value it was told to show. A
// transform transition is handed to the compositor and runs to its target
// whatever the main thread is doing.
const ProgressBar = ({ progress, message, className = '' }) => {
  const share = Math.min(1, Math.max(0, (progress || 0) / 100));
  return (
    <div className={`progress-container ${className}`.trim()}>
      <div className="progress-bar-wrapper">
        <div className="progress-bar" style={{ transform: `scaleX(${share})` }}></div>
      </div>
      {message ? <div className="progress-message">{message}</div> : null}
    </div>
  );
};

export default ProgressBar;
