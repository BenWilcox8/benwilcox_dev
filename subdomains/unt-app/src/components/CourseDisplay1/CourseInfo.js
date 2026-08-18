import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { FaTrash } from 'react-icons/fa';

const CourseInfo = ({ course, isSelected }) => {
    const {
        setAsActiveCourse, removeCourseFromDisplay1,
        yearsAllSelected, semestersAllSelected, restoreFullSelection,
    } = useContext(AppContext);

    // Three states, in order:
    //   not active            -> activate the course
    //   active, part selected -> put every year and semester back on
    //   active, all selected  -> deactivate the course
    const handleClick = () => {
        if (!isSelected) {
            setAsActiveCourse(course);
        } else if (!yearsAllSelected || !semestersAllSelected) {
            restoreFullSelection();
        } else {
            setAsActiveCourse(null);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        removeCourseFromDisplay1(course.main_course_id);
    }

    return (
        <div
            className="course-info"
            onClick={handleClick}
        >
             <button
                onClick={handleDelete}
                className="delete-row-button"
                aria-label="Delete Row"
                tabIndex={-1}
            >
                <FaTrash />
            </button>
            <div>
                <h3 className="course-info-code">{course.course_code}</h3>
                <p className="course-info-name">{course.course_name}</p>
            </div>
        </div>
    );
};

export default React.memo(CourseInfo);
