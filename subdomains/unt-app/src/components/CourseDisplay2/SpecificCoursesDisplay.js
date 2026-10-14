import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { fetchCourseData } from '../../utils/dataUtils';
import { sortOfferings } from '../../utils/sortingUtils';
import CourseCell from './CourseCell';

const EMPTY = [];

const SpecificCoursesDisplay = () => {
    const {
        db, activeCourse, activeYears, activeSemesters, semesterMapping, courseGroupSelection,
        includeFormerProfessors,
    } = useContext(AppContext);
    const [offerings, setOfferings] = useState(EMPTY);

    useEffect(() => {
        if (!db || !activeCourse || activeYears.length === 0 || activeSemesters.length === 0) {
            setOfferings(EMPTY);
            return undefined;
        }

        let cancelled = false;
        const getOfferings = async () => {
            const { selectedOfferings } = await fetchCourseData(
                db, activeCourse.main_course_id, courseGroupSelection, includeFormerProfessors);
            if (cancelled) return;

            const years = new Set(activeYears);
            const semesters = new Set(activeSemesters);
            const filtered = selectedOfferings.filter(o =>
                years.has(o.year) && semesters.has(o.specific_semester));

            setOfferings(sortOfferings(filtered, semesterMapping));
        };
        getOfferings();
        return () => { cancelled = true; };
    }, [db, activeCourse, activeYears, activeSemesters, semesterMapping, courseGroupSelection,
        includeFormerProfessors]);

    if (offerings.length === 0) {
        return (
            <div style={{ width: '100%', textAlign: 'center', color: '#8c8c8c' }}>
                No offerings match the current filters.
            </div>
        );
    }

    return (
        <>
            {offerings.map(offering => (
                <CourseCell key={offering.main_offer_id} offering={offering} />
            ))}
        </>
    );
};

export default SpecificCoursesDisplay;
