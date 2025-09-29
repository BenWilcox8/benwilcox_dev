// src/components/CourseDisplay1/CourseDisplay1.js
import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import CourseRow from './CourseRow';
import SemesterViewHeader from './SemesterView/SemesterViewHeader';
import './CourseDisplay1.css';
import { FiMoreVertical } from 'react-icons/fi';

// Inline component for resize handle
const InfoResizeBar = ({ infoWidth, setInfoWidth }) => {
    const handleRef = useRef(null);

    useEffect(() => {
        const handle = handleRef.current;
        if (!handle) return;

        let startX = 0;
        let startWidth = 0;

        const minWidth = 0; // allow collapse
        const snapThreshold = 30; // px
        let originalUserSelect = '';
        let originalCursor = '';

        const onMouseMove = (e) => {
            const delta = e.clientX - startX;
            let newWidth = Math.max(minWidth, startWidth + delta);
            // Snap to left (collapse) if close to threshold
            if (newWidth < snapThreshold) newWidth = 0;
            setInfoWidth(newWidth);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            // restore selection and cursor
            document.body.style.userSelect = originalUserSelect;
            document.body.style.cursor = originalCursor;
        };

        const onMouseDown = (e) => {
            startX = e.clientX;
            startWidth = infoWidth;
            e.preventDefault();
            // disable text selection while dragging
            originalUserSelect = document.body.style.userSelect;
            document.body.style.userSelect = 'none';
            // force resize cursor during drag
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
            setInfoWidth(newWidth);
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
            startWidth = infoWidth;
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
    }, [infoWidth, setInfoWidth]);

    const leftPos = infoWidth ? infoWidth - 6 : -2; // Center the 12px handle
    return <div ref={handleRef} className="info-resize-handle" style={{ left: `${leftPos}px` }} />;
};

// New component for the indicator icon
const ResizeIndicator = () => (
    <div className="info-resize-indicator-wrapper">
        <FiMoreVertical />
    </div>
);

const CourseDisplay1 = () => {
    const { coursesInDisplay1, reorderCoursesInDisplay1 } = useContext(AppContext);
    const containerRef = useRef(null);
    const [infoWidth, setInfoWidth] = useState(175); // default width including padding & border

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

    const wrapperClass = `course-display1-wrapper${infoWidth === 0 ? ' collapsed' : ''}`;

    return (
        <div className={wrapperClass} style={{ '--info-width': `${infoWidth}px` }}>
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
                    <InfoResizeBar infoWidth={infoWidth} setInfoWidth={setInfoWidth} />
                    <ResizeIndicator />
                </>
            )}
        </div>
    );
};

export default CourseDisplay1;