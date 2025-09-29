// src/components/CourseDisplay2/CourseDisplay2.js
import React, { useContext, useState, useRef, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext';
import YearSpecifier from './YearSpecifier';
import SemesterSpecifier from './SemesterSpecifier';
import SpecificCoursesDisplay from './SpecificCoursesDisplay';
import './CourseDisplay2.css';
import { FiMoreVertical } from 'react-icons/fi';

// Resize handle component
const SpecResizeBar = ({ specWidth, setSpecWidth }) => {
  const handleRef = useRef(null);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    let startX = 0;
    let startWidth = 0;

    const minWidth = 0;
    const snapThreshold = 30;

    let originalUserSelect = '';
    let originalCursor = '';

    const onMouseMove = (e) => {
      const delta = e.clientX - startX;
      let newWidth = Math.max(minWidth, startWidth + delta);
      if (newWidth < snapThreshold) newWidth = 0;
      setSpecWidth(newWidth);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = originalUserSelect;
      document.body.style.cursor = originalCursor;
    };

    const onMouseDown = (e) => {
      startX = e.clientX;
      startWidth = specWidth;
      e.preventDefault();
      originalUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      originalCursor = document.body.style.cursor;
      document.body.style.cursor = 'ew-resize';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onTouchMove = (e) => {
      if (e.touches.length === 0) return;
      const delta = e.touches[0].clientX - startX;
      let newWidth = Math.max(minWidth, startWidth + delta);
      if (newWidth < snapThreshold) newWidth = 0;
      setSpecWidth(newWidth);
      e.preventDefault();
    };

    const onTouchEnd = () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.body.style.userSelect = originalUserSelect;
      document.body.style.cursor = originalCursor;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 0) return;
      startX = e.touches[0].clientX;
      startWidth = specWidth;
      originalUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';
      originalCursor = document.body.style.cursor;
      document.body.style.cursor = 'ew-resize';
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
      e.preventDefault();
    };

    handle.addEventListener('touchstart', onTouchStart, { passive: false });
    handle.addEventListener('mousedown', onMouseDown);
    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      handle.removeEventListener('touchstart', onTouchStart);
    };
  }, [specWidth, setSpecWidth]);

  const leftPos = specWidth === 0 ? 0 : specWidth + 15; // Snap to 0 when collapsed
  return <div ref={handleRef} className="spec-resize-handle" style={{ left: `${leftPos}px` }} />;
};

const SpecResizeIndicator = ({ specWidth }) => {
    const iconLeft = specWidth === 0 ? 2 : specWidth + 17; // Snap to 2 when collapsed for centering
    return (
        <div className="spec-resize-indicator-wrapper" style={{ left: `${iconLeft}px` }}>
            <FiMoreVertical />
        </div>
    );
};

const CourseDisplay2 = () => {
  const { activeCourse } = useContext(AppContext);

  const [specWidth, setSpecWidth] = useState(150);

  const wrapperClass = `course-display2-wrapper${specWidth === 0 ? ' collapsed' : ''}`;

  if (!activeCourse) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#bfbfbf' }}>
        Select a course to see details.
      </div>
    );
  }

  return (
    <div className={wrapperClass} style={{ '--spec-width': `${specWidth}px` }}>
      <div className="specifiers-section">
        <YearSpecifier />
        <SemesterSpecifier />
      </div>
      <div className="specific-courses-area">
        <div className="specific-courses-display">
          <SpecificCoursesDisplay />
        </div>
      </div>
      {/* Resize handle and indicator */}
      <SpecResizeBar specWidth={specWidth} setSpecWidth={setSpecWidth} />
      <SpecResizeIndicator specWidth={specWidth}/>
    </div>
  );
};

export default CourseDisplay2;