import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { FaTrash } from 'react-icons/fa';
import { buttonProps } from '../../utils/keyboardActivation';

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

    // The keyboard target is the course name, not the whole box, so that the
    // delete button is not a control inside another control. A key on the
    // name sends a click, which reaches the click handler of the box.
    return (
        <div
            className="course-info"
            onClick={handleClick}
        >
             <button
                onClick={handleDelete}
                className="delete-row-button"
                aria-label={`Delete ${course.course_code} row`}
            >
                <FaTrash />
            </button>
            <div {...buttonProps} aria-pressed={isSelected}>
                <h3 className="course-info-code">{course.course_code}</h3>
                <p className="course-info-name">{course.course_name}</p>
            </div>
        </div>
    );
};

export default React.memo(CourseInfo);
