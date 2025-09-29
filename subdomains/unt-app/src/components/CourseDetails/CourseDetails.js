import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { fetchAllCatalogForCourse, fetchAllOfferingsForCatalogIds } from '../../utils/dataUtils';
import './CourseDetails.css';

const CourseDetails = () => {
    const { db, activeCourse, courseGroupSelection } = useContext(AppContext);
    const [details, setDetails] = useState(null);
    const [stats, setStats] = useState({
        yearsListed: 0,
        totalOfferings: 0,
        fall: 0,
        summer: 0,
        spring: 0,
        winter: 0,
    });

    const semesterColors = {
        Fall: '#ffc53d',
        Summer: '#fadb14',
        Spring: '#95de64',
        Winter: '#69c0ff',
    };

    useEffect(() => {
        if(db && activeCourse) {
            const getDetails = async () => {
                const allCatalogs = await fetchAllCatalogForCourse(db, activeCourse.main_course_id);
                const selectedCatalogs = allCatalogs.filter(c => courseGroupSelection[c.main_catalog_id] !== false);

                if (selectedCatalogs.length > 0) {
                    const latestCatalog = selectedCatalogs.sort((a,b) => b.catalog_year - a.catalog_year)[0];
                    setDetails(latestCatalog);

                    const selectedCatalogIds = selectedCatalogs.map(c => c.main_catalog_id);
                    const allOfferings = await fetchAllOfferingsForCatalogIds(db, selectedCatalogIds);
                    
                    const newStats = {
                        yearsListed: selectedCatalogs.length,
                        totalOfferings: allOfferings.length,
                        fall: allOfferings.filter(o => o.broad_semester === 'Fall').length,
                        summer: allOfferings.filter(o => o.broad_semester === 'Summer').length,
                        spring: allOfferings.filter(o => o.broad_semester === 'Spring').length,
                        winter: allOfferings.filter(o => o.broad_semester === 'Winter').length,
                    }
                    setStats(newStats);
                } else {
                    setDetails(null);
                    setStats({ yearsListed: 0, totalOfferings: 0, fall: 0, summer: 0, spring: 0, winter: 0 });
                }
            };
            getDetails();
        } else {
            setDetails(null);
            setStats({ yearsListed: 0, totalOfferings: 0, fall: 0, summer: 0, spring: 0, winter: 0 });
        }
    }, [db, activeCourse, courseGroupSelection]);
    
    if(!activeCourse) {
        return (
            <div className="course-details-container course-details-empty">
              Select a course in Course Display 1 to see details.
            </div>
        );
    }

    if (!details) {
        return (
            <div className="course-details-container course-details-empty">
              Loading...
            </div>
        );
    }

    const codeSearchLink = `https://facultyinfo.unt.edu/faculty-search?name=&course=${activeCourse.course_code.replace(/ /g, '+')}`;
    const nameSearchLink = `https://facultyinfo.unt.edu/faculty-search?name=&course=${activeCourse.course_name.replace(/ /g, '+')}`;

    return (
        <div className="course-details-container">
            <div className="course-details-code">{activeCourse.course_code}</div>
            <div className="course-details-name">{activeCourse.course_name}</div>
            
            <div className="course-details-columns">
                <div className="course-details-links">
                    <a href={details.course_link} target="_blank" rel="noopener noreferrer">Catalog Entry</a>
                    <a href={codeSearchLink} target="_blank" rel="noopener noreferrer">Code Search</a>
                    <a href={nameSearchLink} target="_blank" rel="noopener noreferrer">Name Search</a>
                </div>
                <div className="course-details-stats">
                    <p>Years Listed: {stats.yearsListed}</p>
                    <p>Total Offerings: {stats.totalOfferings}</p>
                    <p>Total <span style={{ color: semesterColors.Fall, fontWeight: 'bold' }}>Fall</span>: {stats.fall}</p>
                    <p>Total <span style={{ color: semesterColors.Summer, fontWeight: 'bold' }}>Summer</span>: {stats.summer}</p>
                    <p>Total <span style={{ color: semesterColors.Spring, fontWeight: 'bold' }}>Spring</span>: {stats.spring}</p>
                    <p>Total <span style={{ color: semesterColors.Winter, fontWeight: 'bold' }}>Winter</span>: {stats.winter}</p>
                </div>
            </div>

            <div className="course-details-hours">{details.course_hours} hours {details.course_specific_hours}</div>
            <div className="course-details-description">{details.course_description}</div>
        </div>
    );
};

export default CourseDetails; 