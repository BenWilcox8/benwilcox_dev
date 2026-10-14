// src/components/CourseDisplay1/SemesterView/SemesterView.js
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import { fetchCourseData } from '../../../utils/dataUtils';
import { CURRENT_YEAR } from '../../../config';
import { BROAD_SEMESTERS, buildBroadSemesterMap, sortSpecificSemesters } from '../../../utils/semesterUtils';
import { runMarkers, markerClassNames } from '../../../utils/selectionMarkers';
import SemesterBar from './SemesterBar';
import './SemesterView.css';

const EMPTY = [];

const SemesterView = ({ course, isActiveRow }) => {
    const {
        db, displayYears, courseGroupSelection, semesterMapping,
        activeSemesters, semestersAllSelected, yearMarkers, includeFormerProfessors,
    } = useContext(AppContext);
    const [offerings, setOfferings] = useState(EMPTY);
    const [listedYears, setListedYears] = useState(() => new Set());
    const [allOfferings, setAllOfferings] = useState(EMPTY);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            if (!db || !course) return;
            const data = await fetchCourseData(
                db, course.main_course_id, courseGroupSelection, includeFormerProfessors);
            if (cancelled) return;
            setAllOfferings(data.offerings);
            setOfferings(data.selectedOfferings);
            setListedYears(new Set(data.catalog.map(cat => cat.catalog_year)));
        };
        load();
        return () => { cancelled = true; };
    }, [db, course, courseGroupSelection, includeFormerProfessors]);

    // The specific semesters this course has ever had, per broad semester.
    const specificSemesterTypes = useMemo(() => {
        const types = {};
        BROAD_SEMESTERS.forEach(broad => { types[broad] = []; });
        allOfferings.forEach(offering => {
            const list = types[offering.broad_semester];
            if (list && !list.includes(offering.specific_semester)) {
                list.push(offering.specific_semester);
            }
        });
        BROAD_SEMESTERS.forEach(broad => {
            types[broad] = sortSpecificSemesters(types[broad], semesterMapping, broad);
        });
        return types;
    }, [allOfferings, semesterMapping]);

    // One lookup instead of a full scan of the offerings per year and semester.
    const offeringsByCell = useMemo(() => {
        const map = new Map();
        for (const offering of offerings) {
            const key = `${offering.year}|${offering.broad_semester}`;
            const list = map.get(key);
            if (list) list.push(offering); else map.set(key, [offering]);
        }
        return map;
    }, [offerings]);

    const yearsWithOfferings = useMemo(
        () => new Set(offerings.map(o => o.year)), [offerings]);

    // --- selection markers ---
    // They show which year columns and which semester bands the specifiers of
    // Course Display 2 currently hold. A full selection needs no marker.
    //
    // The year markers come from the context: they span the whole column, so
    // every row draws the same run as the header. The semester markers are a
    // property of one row, so they stay on the active row.
    const markedBroadSemesters = useMemo(() => {
        if (!isActiveRow || semestersAllSelected) return null;
        const broadOf = buildBroadSemesterMap(semesterMapping);
        const marked = new Set();
        for (const specific of activeSemesters) {
            const broad = broadOf.get(specific);
            if (broad) marked.add(broad);
        }
        return marked;
    }, [isActiveRow, semestersAllSelected, activeSemesters, semesterMapping]);

    const semesterMarkers = useMemo(() => {
        const runs = runMarkers(BROAD_SEMESTERS,
            broad => !!markedBroadSemesters && markedBroadSemesters.has(broad));
        const byBroad = {};
        BROAD_SEMESTERS.forEach((broad, i) => { byBroad[broad] = runs[i]; });
        return byBroad;
    }, [markedBroadSemesters]);

    return (
        <div className="semester-view-container">
            {displayYears.map((year, index) => {
                const hasOfferings = yearsWithOfferings.has(year);
                // Catalog years represent the start of an academic year (e.g., 2025 catalog = 2025–2026).
                // So Spring/Summer of the current year should be considered "listed" if the course exists in the previous year's catalog.
                const isListedForCurrentAcademicYear = year === CURRENT_YEAR && listedYears.has(CURRENT_YEAR - 1);
                const isListed = listedYears.has(year) || isListedForCurrentAcademicYear || hasOfferings;
                const isPre2011 = year <= 2010;
                const yearClass = isPre2011 ? 'pre-2011' : (isListed ? 'listed' : 'unlisted');

                const markerClass = markerClassNames(yearMarkers[index], 'year');

                return (
                    <div key={year} className={`year-column ${yearClass}${markerClass}`}>
                        <div className="semester-cell">
                            {BROAD_SEMESTERS.map(semester => (
                                <SemesterBar
                                    key={`${year}-${semester}`}
                                    course={course}
                                    year={year}
                                    broadSemester={semester}
                                    offeringsForSemester={offeringsByCell.get(`${year}|${semester}`) || EMPTY}
                                    specificSemesterTypes={specificSemesterTypes[semester] || EMPTY}
                                    marker={semesterMarkers[semester]}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(SemesterView);
