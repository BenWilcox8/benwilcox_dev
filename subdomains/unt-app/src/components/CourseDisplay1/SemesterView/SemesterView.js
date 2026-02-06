// src/components/CourseDisplay1/SemesterView/SemesterView.js
import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import { fetchAllOfferingsForCatalogIds, fetchAllCatalogForCourse, fetchOfferingsForCourse } from '../../../utils/dataUtils';
import SemesterBar from './SemesterBar';
import './SemesterView.css';

const SemesterView = ({ course }) => {
    const { 
        db, showAllYears, coursesInDisplay1, courseGroupSelection, semesterMapping 
    } = useContext(AppContext);
    const [years, setYears] = useState([]);
    const [offerings, setOfferings] = useState([]);
    const [listedYears, setListedYears] = useState(new Set());
    const [specificSemesterTypes, setSpecificSemesterTypes] = useState({});

    useEffect(() => {
        const getYears = async () => {
            if (!db) return;
            let allOfferings = [];
            let allListedYears = new Set();

            for (const c of coursesInDisplay1) {
                const catalogs = await fetchAllCatalogForCourse(db, c.main_course_id);
                catalogs.forEach(cat => allListedYears.add(cat.catalog_year));
                const catalogIds = catalogs.map(cat => cat.main_catalog_id);
                if (catalogIds.length > 0) {
                    const courseOfferings = await fetchAllOfferingsForCatalogIds(db, catalogIds);
                    allOfferings.push(...courseOfferings);
                }
            }

            const uniqueOfferingYears = [...new Set(allOfferings.map(o => o.year))];

            if (showAllYears && allListedYears.size > 0) {
                // Range from earliest of catalog year OR offering year to current year (2026)
                const earliestCatalogYear = Math.min(...allListedYears);
                const earliestOfferingYear = uniqueOfferingYears.length > 0 ? Math.min(...uniqueOfferingYears) : earliestCatalogYear;
                const earliestYear = Math.min(earliestCatalogYear, earliestOfferingYear) - 1;
                const currentYear = 2026;
                setYears(Array.from({ length: currentYear - earliestYear + 1 }, (_, i) => currentYear - i));
            } else {
                // Only show years with offerings
                const displayYears = uniqueOfferingYears.sort((a, b) => b - a);
                setYears(displayYears);
            }
        };
        getYears();
    }, [db, showAllYears, coursesInDisplay1]);

    useEffect(() => {
        const getOfferingsAndTypes = async () => {
            if (!db || !course) return;

            // Step 1: Fetch all offerings for the course across all years
            const allOfferingsForCourse = await fetchOfferingsForCourse(db, course.main_course_id);

            // Step 2: Determine unique specific semester types for each broad semester
            const types = {};

            // Initialize with empty arrays to ensure all broad semesters are considered
            ['Fall', 'Summer', 'Spring', 'Winter'].forEach(broad => {
                types[broad] = [];
            });

            // Collect all unique specific semester types from the course's offerings
            allOfferingsForCourse.forEach(offering => {
                const broadSemester = offering.broad_semester;
                const specificSemester = offering.specific_semester;
                if (types[broadSemester] && !types[broadSemester].includes(specificSemester)) {
                    types[broadSemester].push(specificSemester);
                }
            });

            // If semesterMapping is available, sort the collected types
            if (semesterMapping && semesterMapping.length > 0) {
                for (const broad in types) {
                    const semesterOrder = semesterMapping
                        .filter(sm => sm['Broad Semester'] === broad)
                        .reduce((acc, curr) => {
                            acc[curr['Specific Semester']] = curr['Semester Order'];
                            return acc;
                        }, {});
                    types[broad].sort((a, b) => {
                        if (semesterOrder[a] !== undefined && semesterOrder[b] !== undefined) {
                            return semesterOrder[a] - semesterOrder[b];
                        }
                        return a.localeCompare(b); // Fallback alphabetical if order not defined
                    });
                }
            }
            
            setSpecificSemesterTypes(types);

            // Step 3: Filter offerings based on course group selection
            const catalogs = await fetchAllCatalogForCourse(db, course.main_course_id);
            const selectedCatalogIds = catalogs
                .filter(c => courseGroupSelection[c.main_catalog_id] !== false)
                .map(c => c.main_catalog_id);

            if (selectedCatalogIds.length > 0) {
                const courseOfferings = await fetchAllOfferingsForCatalogIds(db, selectedCatalogIds);
                setOfferings(courseOfferings);
            } else {
                setOfferings([]);
            }
        };

        getOfferingsAndTypes();
    }, [db, course, courseGroupSelection, semesterMapping]);

    useEffect(() => {
        const getListedYears = async () => {
            if (!db || !course) return;
            const catalogs = await fetchAllCatalogForCourse(db, course.main_course_id);
            const courseListedYears = new Set(catalogs.map(cat => cat.catalog_year));
            setListedYears(courseListedYears);
        };
        getListedYears();
    }, [db, course]);

    return (
        <div className="semester-view-container">
            {years.map(year => {
                const hasOfferings = offerings.some(o => o.year === year);
                const isListed = listedYears.has(year) || hasOfferings;
                const isPre2011 = year <= 2010;
                const yearClass = isPre2011 ? 'pre-2011' : (isListed ? 'listed' : 'unlisted');
                return (
                    <div key={year} className={`year-column ${yearClass}`}>
                        <div className="semester-cell">
                            {['Fall', 'Summer', 'Spring', 'Winter'].map(semester => (
                                <SemesterBar
                                    key={`${year}-${semester}`}
                                    course={course}
                                    year={year}
                                    broadSemester={semester}
                                    offeringsForSemester={offerings.filter(o => o.year === year && o.broad_semester === semester)}
                                    specificSemesterTypes={specificSemesterTypes[semester] || []}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default SemesterView;