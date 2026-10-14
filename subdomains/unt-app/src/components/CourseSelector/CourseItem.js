import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { FaThumbtack } from 'react-icons/fa';
import { buttonProps } from '../../utils/keyboardActivation';

// True when focus came from the keyboard. A mouse click also focuses the
// course name, and that focus must not keep the pin on screen.
const focusFromKeyboard = (element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
};

const CourseItem = ({ course }) => {
  const { addCourseToDisplay1, togglePin, pinnedCourses } = useContext(AppContext);
  const [isHovered, setIsHovered] = useState(false);
  const [pinHovered, setPinHovered] = useState(false);
  // The pin shows on hover. Keyboard focus in the row shows it too, or a
  // keyboard could never reach the pin of an unpinned course.
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const isPinned = pinnedCourses.some(p => p.main_course_id === course.main_course_id);

  const handleCourseClick = () => {
    addCourseToDisplay1(course);
  };

  const handlePinClick = (e) => {
    e.stopPropagation(); // Prevent course click event
    togglePin(course);
  };

  const handleFocus = (e) => {
    if (focusFromKeyboard(e.target)) setKeyboardFocused(true);
  };

  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setKeyboardFocused(false);
  };

  return (
    <li
      className={`course-item ${isHovered && !pinHovered ? 'hover-highlight' : ''}`}
      onClick={handleCourseClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
        <span
            className="course-item-text"
            {...buttonProps}
            aria-label={`Add ${course.course_code} - ${course.course_name} to Course Display 1`}
        >
            <strong>{course.course_code}</strong> - {course.course_name}
        </span>
        {(isHovered || keyboardFocused || isPinned) && (
            <button
                onClick={handlePinClick}
                onMouseEnter={() => setPinHovered(true)}
                onMouseLeave={() => setPinHovered(false)}
                className="pin-button"
                aria-label={`Pin ${course.course_code}`}
                aria-pressed={isPinned}
            >
                <FaThumbtack className={`pin-icon ${isPinned ? 'pinned' : ''}`} />
            </button>
        )}
    </li>
  );
};

export default CourseItem;
