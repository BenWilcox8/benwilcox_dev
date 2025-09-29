import React, { useState, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import CourseSelector from './CourseSelector/CourseSelector';
import CourseDisplay1 from './CourseDisplay1/CourseDisplay1';
import CourseDisplay2 from './CourseDisplay2/CourseDisplay2';
import CourseDetails from './CourseDetails/CourseDetails';
import './MobileMainPage.css';
import Header from './shared/Header';

const VIEW_LABELS = {
  selector: 'Course Selector',
  display1: 'Course Display 1',
  display2: 'Course Display 2',
  details: 'Course Details',
};

export default function MobileMainPage() {
  // Keep the order stable to avoid remounts when switching
  const views = useMemo(() => ({
    selector: <CourseSelector />,
    display1: <CourseDisplay1 />,
    display2: <CourseDisplay2 />,
    details: <CourseDetails />,
  }), []);

  // Default view is selector per requirements
  const [activeView, setActiveView] = useState('selector');

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`mobile-main-container active-${activeView}`}>
      {/* Edge navigation bars - always visible */}
      {activeView !== 'selector' && (
        <button
          className="edge-bar left"
          onClick={() => setActiveView('selector')}
          aria-label="Open Course Selector"
        >
          <span className="edge-label vertical">{VIEW_LABELS.selector}</span>
        </button>
      )}

      {activeView !== 'display1' && (
        <button
          className="edge-bar right"
          onClick={() => setActiveView('display1')}
          aria-label="Open Course Display 1"
        >
          <span className="edge-label vertical">{VIEW_LABELS.display1}</span>
        </button>
      )}

      {activeView !== 'display2' && (
        <button
          className="edge-bar top"
          onClick={() => setActiveView('display2')}
          aria-label="Open Course Display 2"
        >
          <span className="edge-label horizontal">{VIEW_LABELS.display2}</span>
        </button>
      )}

      {activeView !== 'details' && (
        <button
          className="edge-bar bottom"
          onClick={() => setActiveView('details')}
          aria-label="Open Course Details"
        >
          <span className="edge-label horizontal">{VIEW_LABELS.details}</span>
        </button>
      )}

      {/* Content area shows only the active view */}
      <div className="mobile-content">
        <Header />
        <div className="mobile-divider" />
        {views[activeView]}
      </div>
      </div>
    </DndProvider>
  );
}


