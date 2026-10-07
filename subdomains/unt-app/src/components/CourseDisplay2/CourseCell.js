import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { fetchFacultyById } from '../../utils/dataUtils';
import { formerProfessorTitle } from '../../utils/formerProfessors';

const CourseCell = ({ offering }) => {
    const { db } = useContext(AppContext);
    const [faculty, setFaculty] = useState(null);

    useEffect(() => {
        // 0 is a real Faculty ID, so only a missing ID means "Staff".
        if (db && offering.main_faculty_id != null && offering.main_faculty_id !== '') {
            fetchFacultyById(db, offering.main_faculty_id).then(setFaculty);
        } else {
            setFaculty(null);
        }
    }, [db, offering]);

    // A former professor's profile page no longer exists, so neither the name
    // nor the section links to it.
    const former = !!offering.faculty_former;

    const renderFaculty = () => {
        if (!faculty) return <p className="faculty-name">Staff</p>;
        if (former) {
            return (
                <span className="faculty-name faculty-former" title={formerProfessorTitle(faculty.faculty_last_seen)}>
                    {faculty.faculty_name}
                </span>
            );
        }
        return (
            <a href={faculty.faculty_link} target="_blank" rel="noopener noreferrer" className="faculty-name">
                {faculty.faculty_name}
            </a>
        );
    };

    return (
        <div className="course-cell">
            <div>
                {renderFaculty()}
            </div>
            <div>
                <div className="semester-year-info">{offering.specific_semester} {offering.year}</div>
                {former ? (
                    <span className="course-name-text">{offering.full_course_name}</span>
                ) : (
                    <a href={offering.link_to_highlight} target="_blank" rel="noopener noreferrer" className="course-name-link">
                        {offering.full_course_name}
                    </a>
                )}
            </div>
            {offering.course_name && (
                <div className="course-cell-name">{offering.course_name}</div>
            )}
        </div>
    );
};

export default React.memo(CourseCell);
