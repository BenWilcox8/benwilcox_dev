import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../../contexts/AppContext';
import Checkbox from '../../shared/Checkbox';
import { fetchAllCatalogForCourse, fetchAllOfferingsForCatalogIds } from '../../../utils/dataUtils';

const SemesterViewHeader = () => {
    const { 
        granularView, setGranularView, 
        showAllYears, setShowAllYears, 
        showCourseCount, setShowCourseCount,
        db,
        coursesInDisplay1,
        activeCourse,
        setActiveYears,
        setActiveSemesters
    } = useContext(AppContext);

    const [years, setYears] = useState([]);

    useEffect(() => {
        const getYears = async () => {
            if (!db) return;
            let allOfferings = [];
            let allListedYears = new Set();
            
            for(const c of coursesInDisplay1){
                const catalogs = await fetchAllCatalogForCourse(db, c.main_course_id);
                catalogs.forEach(cat => allListedYears.add(cat.catalog_year));
                const catalogIds = catalogs.map(cat => cat.main_catalog_id);
                const courseOfferings = await fetchAllOfferingsForCatalogIds(db, catalogIds);
                allOfferings.push(...courseOfferings);
            }
            
            const uniqueOfferingYears = [...new Set(allOfferings.map(o => o.year))].sort((a,b) => b-a);

            if (showAllYears && allListedYears.size > 0) {
                // Range from earliest of catalog year OR offering year to current year (2026)
                const earliestCatalogYear = Math.min(...allListedYears);
                const earliestOfferingYear = uniqueOfferingYears.length > 0 ? Math.min(...uniqueOfferingYears) : earliestCatalogYear;
                const earliestYear = Math.min(earliestCatalogYear, earliestOfferingYear) - 1;
                const currentYear = 2026;
                const yearRange = Array.from({length: currentYear - earliestYear + 1}, (_, i) => currentYear - i);
                setYears(yearRange);
            } else {
                // Only show years with offerings
                setYears(uniqueOfferingYears);
            }
        };

        getYears();
    }, [db, showAllYears, coursesInDisplay1]);
    
    const handleYearClick = async (year) => {
        setActiveYears([year]);
        if (activeCourse && db) {
            const allCatalog = await fetchAllCatalogForCourse(db, activeCourse.main_course_id);
            const allCatalogIds = allCatalog.map(c => c.main_catalog_id);
            const offerings = await fetchAllOfferingsForCatalogIds(db, allCatalogIds);
            const offeringsInYear = offerings.filter(o => o.year === year);
            const relevantSemesters = [...new Set(offeringsInYear.map(o => o.specific_semester))];
            setActiveSemesters(relevantSemesters);
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
                        </div>
                    )}
                </div>

                <div className="semester-view-header-timeline">
                    {years.map(year => (
                        <div key={year} className="year-column-header" onClick={() => handleYearClick(year)}>
                            {year}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SemesterViewHeader;
