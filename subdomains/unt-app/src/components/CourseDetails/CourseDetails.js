import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { fetchCourseData } from '../../utils/dataUtils';
import './CourseDetails.css';

const EMPTY_STATS = {
    yearsListed: 0,
    totalOfferings: 0,
    fall: 0,
    summer: 0,
    spring: 0,
    winter: 0,
};

const semesterColors = {
    Fall: '#ffc53d',
    Summer: '#fadb14',
    Spring: '#95de64',
    Winter: '#69c0ff',
};

const CourseDetails = () => {
    const { db, activeCourse, courseGroupSelection } = useContext(AppContext);
    const [details, setDetails] = useState(null);
    const [stats, setStats] = useState(EMPTY_STATS);

    useEffect(() => {
        if (!db || !activeCourse) {
            setDetails(null);
            setStats(EMPTY_STATS);
            return undefined;
        }

        let cancelled = false;
        const getDetails = async () => {
            const { selectedCatalog, selectedOfferings } = await fetchCourseData(
                db, activeCourse.main_course_id, courseGroupSelection);
            if (cancelled) return;

            if (selectedCatalog.length === 0) {
                setDetails(null);
                setStats(EMPTY_STATS);
                return;
            }

            const latestCatalog = [...selectedCatalog]
                .sort((a, b) => b.catalog_year - a.catalog_year)[0];
            setDetails(latestCatalog);

            const counts = { Fall: 0, Summer: 0, Spring: 0, Winter: 0 };
            for (const offering of selectedOfferings) {
                if (counts[offering.broad_semester] !== undefined) counts[offering.broad_semester] += 1;
            }

            setStats({
                yearsListed: selectedCatalog.length,
                totalOfferings: selectedOfferings.length,
                fall: counts.Fall,
                summer: counts.Summer,
                spring: counts.Spring,
                winter: counts.Winter,
            });
        };
        getDetails();
        return () => { cancelled = true; };
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
