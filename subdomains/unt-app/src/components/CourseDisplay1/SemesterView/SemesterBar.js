import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../../contexts/AppContext';

const NO_MARKER = { marked: false, start: false, end: false };

const SemesterBar = ({ course, year, broadSemester, offeringsForSemester, specificSemesterTypes, marker = NO_MARKER }) => {
    const {
        granularView,
        showCourseCount,
        setAsActiveCourse
    } = useContext(AppContext);

    const countsBySpecific = useMemo(() => {
        const counts = new Map();
        for (const offering of offeringsForSemester) {
            counts.set(offering.specific_semester, (counts.get(offering.specific_semester) || 0) + 1);
        }
        return counts;
    }, [offeringsForSemester]);

    const handleBroadClick = () => {
        setAsActiveCourse(course, year, specificSemesterTypes);
    };

    const handleSpecificClick = (e, specificSemester) => {
        e.stopPropagation();
        setAsActiveCourse(course, year, specificSemester);
    };

    const renderGranularView = () => {
        const barTypes = specificSemesterTypes.length > 0 ? specificSemesterTypes : [broadSemester];
        return (
            <div className="granular-view-container" onClick={handleBroadClick}>
                {barTypes.map(specificType => {
                    const offeringCount = countsBySpecific.get(specificType) || 0;
                    const filledClass = offeringCount > 0 ? 'filled' : '';

                    return (
                        <div
                            key={specificType}
                            className={`specific-semester-bar ${broadSemester.toLowerCase()} ${filledClass}`}
                            title={`${specificType} (${offeringCount} offerings)`}
                            onClick={(e) => handleSpecificClick(e, specificType)}
                        >
                            {showCourseCount && offeringCount > 0 && <span>{offeringCount}</span>}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderBroadView = () => {
        const offeringCount = offeringsForSemester.length;
        const filledClass = offeringCount > 0 ? 'filled' : '';

        return (
            <div
                className={`semester-bar ${broadSemester.toLowerCase()} ${filledClass}`}
                onClick={handleBroadClick}
                title={`${broadSemester} ${year} (${offeringCount} offerings)`}
            >
                {showCourseCount && offeringCount > 0 && <span>{offeringCount}</span>}
            </div>
        );
    };

    const markerClass = marker.marked
        ? ` sem-marked${marker.start ? ' sem-marked-start' : ''}${marker.end ? ' sem-marked-end' : ''}`
        : '';

    return (
        <div className={`semester-bar-wrapper${markerClass}`}>
            {granularView ? renderGranularView() : renderBroadView()}
        </div>
    );
};

export default React.memo(SemesterBar);
