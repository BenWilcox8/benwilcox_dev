// src/components/CourseDisplay1/CourseDisplay1.js
import React, { useContext, useRef, useEffect, useState, useCallback } from 'react';
import { AppContext } from '../../contexts/AppContext';
import CourseRow from './CourseRow';
import SemesterViewHeader from './SemesterView/SemesterViewHeader';
import ResizeHandle from '../shared/ResizeHandle';
import './CourseDisplay1.css';
import { FiMoreVertical } from 'react-icons/fi';

const DEFAULT_INFO_WIDTH = 175; // default width including padding & border

// Left of the 12px handle, as a continuous function of the info column width.
// `Math.max` keeps the collapsed handle where it has always sat, and the two
// branches meet at 4px, so the handle never jumps away from the pointer.
const infoHandleLeft = (width) => Math.max(width - 6, -2);

// New component for the indicator icon
const ResizeIndicator = () => (
    <div className="info-resize-indicator-wrapper">
        <FiMoreVertical />
    </div>
);

const CourseDisplay1 = () => {
    const { coursesInDisplay1, reorderCoursesInDisplay1 } = useContext(AppContext);
    const containerRef = useRef(null);
    const wrapperRef = useRef(null);
    const [infoWidth, setInfoWidth] = useState(DEFAULT_INFO_WIDTH);

    useEffect(() => {
        const element = containerRef.current;
        if (element) {
            const handleWheel = (e) => {
                const isSemesterArea = e.target.closest('.semester-view-container, .semester-view-header-years');
                if (isSemesterArea) {
                    if (e.deltaY === 0) return;
                    e.preventDefault();
                    element.scrollLeft += e.deltaY + e.deltaX;
                }
            };
            element.addEventListener('wheel', handleWheel, { passive: false });
            return () => element.removeEventListener('wheel', handleWheel);
        }
    }, []);

    // Never let the info column push the timeline out of the panel.
    const getMaxInfoWidth = useCallback(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return Infinity;
        return Math.max(0, wrapper.clientWidth - 40);
    }, []);

    const wrapperClass = `course-display1-wrapper${infoWidth === 0 ? ' collapsed' : ''}`;

    return (
        <div className={wrapperClass} ref={wrapperRef} style={{ '--info-width': `${infoWidth}px` }}>
            <div className="course-display1-container" ref={containerRef}>
                <SemesterViewHeader />
                <div className="course-display1-list">
                    {coursesInDisplay1.map((course, index) => (
                        <CourseRow
                            key={course.main_course_id}
                            index={index}
                            course={course}
                            moveRow={reorderCoursesInDisplay1}
                        />
                    ))}
                    {coursesInDisplay1.length === 0 && (
                        <div className="course-display1-empty-message">
                            Click on a course to add it to the timeline.
                        </div>
                    )}
                </div>
            </div>
            {/* Resize Handle and Indicator (outside scrolling container) */}
            {coursesInDisplay1.length > 0 && (
                <>
                    <ResizeHandle
                        className="info-resize-handle"
                        width={infoWidth}
                        setWidth={setInfoWidth}
                        position={infoHandleLeft}
                        getMaxWidth={getMaxInfoWidth}
                    />
                    <ResizeIndicator />
                </>
            )}
        </div>
    );
};

export default CourseDisplay1;
