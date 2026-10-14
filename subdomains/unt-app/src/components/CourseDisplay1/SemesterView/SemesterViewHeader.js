import React, { useContext } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import Checkbox from '../../shared/Checkbox';
import { fetchCourseData } from '../../../utils/dataUtils';
import { markerClassNames } from '../../../utils/selectionMarkers';

const SemesterViewHeader = () => {
    const {
        granularView, setGranularView,
        showAllYears, setShowAllYears,
        showCourseCount, setShowCourseCount,
        includeFormerProfessors, setIncludeFormerProfessors,
        db,
        coursesInDisplay1,
        displayYears,
        yearMarkers,
        activeCourse,
        courseGroupSelection,
        setActiveYears,
        setActiveSemesters
    } = useContext(AppContext);

    const handleYearClick = async (year) => {
        setActiveYears([year]);
        if (activeCourse && db) {
            const { selectedOfferings } = await fetchCourseData(
                db, activeCourse.main_course_id, courseGroupSelection, includeFormerProfessors);
            const offeringsInYear = selectedOfferings.filter(o => o.year === year);
            setActiveSemesters([...new Set(offeringsInYear.map(o => o.specific_semester))]);
        }
    }

    return (
        <div className="semester-view-header">
            <div className="semester-view-header-row">
                <div className="semester-view-header-info">
                    {coursesInDisplay1.length > 0 && (
                        <div className="semester-view-header-toggles">
                            <Checkbox id="granular" label="Granular View" checked={granularView} onChange={e => setGranularView(e.target.checked)} />
                            <Checkbox id="all-years" label="Show All Years" checked={showAllYears} onChange={e => setShowAllYears(e.target.checked)} />
                            <Checkbox id="course-count" label="Course Count" checked={showCourseCount} onChange={e => setShowCourseCount(e.target.checked)} />
                            <Checkbox id="former-professors" label="Include Former Professors" checked={includeFormerProfessors} onChange={e => setIncludeFormerProfessors(e.target.checked)} />
                        </div>
                    )}
                </div>

                <div className="semester-view-header-timeline">
                    {displayYears.map((year, index) => (
                        <div
                            key={year}
                            className={`year-column-header${markerClassNames(yearMarkers[index], 'year')}`}
                            onClick={() => handleYearClick(year)}
                        >
                            {year}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SemesterViewHeader;
