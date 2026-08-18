// src/components/CourseDisplay2/CourseDisplay2.js
import React, { useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import YearSpecifier from './YearSpecifier';
import SemesterSpecifier from './SemesterSpecifier';
import SpecificCoursesDisplay from './SpecificCoursesDisplay';
import ResizeHandle from '../shared/ResizeHandle';
import './CourseDisplay2.css';
import { FiMoreVertical } from 'react-icons/fi';
import useIsMobile from '../../hooks/useIsMobile';

const MIN_SPEC_WIDTH = 150;
const WRAPPER_PADDING = 15; // .course-display2-wrapper padding-left
// One offering cell (130px) plus its scrollbar, kept free for the offerings.
const OFFERINGS_RESERVE = 150;

// Left of the handle, as a continuous function of the specifier width.
// The open panel keeps the 15px of wrapper padding between the panel edge and
// the specifiers; the collapsed panel drops it. Ramping the offset over the
// first 15px keeps the handle position identical at every resting width and
// stops it from jumping out from under the pointer during a drag.
const specHandleLeft = (width) => width + Math.min(width, WRAPPER_PADDING);

// The width one specifier box needs for every checkbox to sit left of its
// label with the label on one line.
//
// The list is its own scroll container, so the width of the box does not show
// what the rows inside it need. Each row is measured with wrapping off, and
// the frame of the list is added back.
const naturalBoxWidth = (box) => {
  const list = box.querySelector('.specifier-list');
  const heading = box.querySelector('h4');
  if (!list) return box.scrollWidth;

  // The label is a flex item, so it shrinks and its text wraps inside it. The
  // row therefore always looks like it fits; the width the label wants is its
  // own scrollWidth, measured with wrapping off.
  const previous = list.style.whiteSpace;
  list.style.whiteSpace = 'nowrap';
  let widest = 0;
  for (const row of list.children) {
    const input = row.querySelector('input');
    const label = row.querySelector('label');
    const inputStyle = input ? window.getComputedStyle(input) : null;
    const inputWidth = input
      ? input.offsetWidth + parseFloat(inputStyle.marginLeft) + parseFloat(inputStyle.marginRight)
      : 0;
    widest = Math.max(widest, inputWidth + (label ? label.scrollWidth : 0));
  }
  list.style.whiteSpace = previous;

  // The frame around the rows: the borders and the vertical scrollbar
  // (offsetWidth - clientWidth), plus the padding of the list.
  const style = window.getComputedStyle(list);
  const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  const frame = (list.offsetWidth - list.clientWidth) + padding;

  const headingWidth = heading ? heading.scrollWidth : 0;
  return Math.max(widest + frame, headingWidth) + 2; // 2px of slack for rounding
};

const SpecResizeIndicator = ({ specWidth }) => (
    <div className="spec-resize-indicator-wrapper" style={{ left: `${specHandleLeft(specWidth) + 2}px` }}>
        <FiMoreVertical />
    </div>
);

const CourseDisplay2 = () => {
  const { activeCourse, courseGroupSelection } = useContext(AppContext);
  const isMobile = useIsMobile(900);

  const [specWidth, setSpecWidth] = useState(MIN_SPEC_WIDTH);
  // Auto-fitting stops for good once the user drags the handle.
  const [userSized, setUserSized] = useState(false);
  const wrapperRef = useRef(null);
  const sectionRef = useRef(null);

  // Fit the specifier boxes to their content, so that every checkbox sits left
  // of its label with the label on one line. The measurement runs before paint.
  // By decision, the fit runs on course activation and group change only, not
  // on panel resize: a label that wraps after the panel is widened stays
  // wrapped until the next activation. Do not add a ResizeObserver.
  useLayoutEffect(() => {
    if (userSized || isMobile) return;
    const section = sectionRef.current;
    const wrapper = wrapperRef.current;
    if (!section || !wrapper) return;

    const boxes = section.querySelectorAll('.specifier-box');
    if (boxes.length === 0) return;

    // Each box takes the width its own labels need. The section holds the sum
    // of those widths and the gaps between them.
    let natural = 10 * (boxes.length - 1);
    for (const box of boxes) {
      natural += naturalBoxWidth(box);
    }

    // Keep room for the offerings. When the panel is too narrow to hold both,
    // the labels wrap again, which is what a genuinely short panel must do.
    // A wrapper with no width has not been laid out yet, so only then does
    // the fit fall back to the natural width.
    const available = wrapper.clientWidth === 0
      ? natural
      : Math.max(0, wrapper.clientWidth - 2 * WRAPPER_PADDING - OFFERINGS_RESERVE);
    const fitted = Math.max(MIN_SPEC_WIDTH, Math.min(natural, available));
    setSpecWidth(prev => (Math.abs(prev - fitted) < 1 ? prev : fitted));
  }, [activeCourse, courseGroupSelection, userSized, isMobile]);

  const handleResize = useCallback((width) => {
    setUserSized(true);
    setSpecWidth(width);
  }, []);

  const getMaxSpecWidth = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return Infinity;
    return Math.max(0, wrapper.clientWidth - 2 * WRAPPER_PADDING - 40);
  }, []);

  const wrapperClass = `course-display2-wrapper${specWidth === 0 ? ' collapsed' : ''}`;

  if (!activeCourse) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#bfbfbf' }}>
        Select a course in Course Display 1 to see details.
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="course-display2-mobile">
        <div className="cd2-mobile-specifiers">
          <div className="cd2-row cd2-years">
            <YearSpecifier />
          </div>
          <div className="cd2-row cd2-semesters">
            <SemesterSpecifier />
          </div>
        </div>
        <div className="cd2-mobile-content">
          <div className="specific-courses-display">
            <SpecificCoursesDisplay />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} ref={wrapperRef} style={{ '--spec-width': `${specWidth}px` }}>
      <div className="specifiers-section" ref={sectionRef}>
        <YearSpecifier />
        <SemesterSpecifier />
      </div>
      <div className="specific-courses-area">
        <div className="specific-courses-display">
          <SpecificCoursesDisplay />
        </div>
      </div>
      {/* Resize handle and indicator */}
      <ResizeHandle
        className="spec-resize-handle"
        width={specWidth}
        setWidth={handleResize}
        position={specHandleLeft}
        getMaxWidth={getMaxSpecWidth}
      />
      <SpecResizeIndicator specWidth={specWidth}/>
    </div>
  );
};

export default CourseDisplay2;
