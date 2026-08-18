import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppContext, coversAll } from '../../contexts/AppContext';
import CourseInfo from './CourseInfo';

const course = { main_course_id: 7, course_code: 'ENGL 1310', course_name: 'First-Year Writing I' };

const renderInfo = (isSelected, contextOverrides) => {
    const value = {
        setAsActiveCourse: jest.fn(),
        removeCourseFromDisplay1: jest.fn(),
        restoreFullSelection: jest.fn(),
        yearsAllSelected: true,
        semestersAllSelected: true,
        ...contextOverrides,
    };
    render(
        <AppContext.Provider value={value}>
            <CourseInfo course={course} isSelected={isSelected} />
        </AppContext.Provider>
    );
    return value;
};

const clickName = () => fireEvent.click(screen.getByText('ENGL 1310'));

describe('CourseInfo click', () => {
    it('activates a course that is not active', () => {
        const ctx = renderInfo(false);
        clickName();
        expect(ctx.setAsActiveCourse).toHaveBeenCalledWith(course);
        expect(ctx.restoreFullSelection).not.toHaveBeenCalled();
    });

    it('puts the full selection back when only some years are on', () => {
        const ctx = renderInfo(true, { yearsAllSelected: false });
        clickName();
        expect(ctx.restoreFullSelection).toHaveBeenCalled();
        expect(ctx.setAsActiveCourse).not.toHaveBeenCalled();
    });

    it('puts the full selection back when only some semesters are on', () => {
        const ctx = renderInfo(true, { semestersAllSelected: false });
        clickName();
        expect(ctx.restoreFullSelection).toHaveBeenCalled();
        expect(ctx.setAsActiveCourse).not.toHaveBeenCalled();
    });

    it('deactivates the course when every year and semester is already on', () => {
        const ctx = renderInfo(true);
        clickName();
        expect(ctx.setAsActiveCourse).toHaveBeenCalledWith(null);
        expect(ctx.restoreFullSelection).not.toHaveBeenCalled();
    });

    it('deactivates the course when no course group is selected', () => {
        // Every catalog group deselected leaves the relevant sets empty, so a
        // restore would change nothing and the click must deselect instead.
        const ctx = renderInfo(true, {
            yearsAllSelected: coversAll([], []),
            semestersAllSelected: coversAll([], []),
        });
        clickName();
        expect(ctx.setAsActiveCourse).toHaveBeenCalledWith(null);
        expect(ctx.restoreFullSelection).not.toHaveBeenCalled();
    });

    it('removes the row from the delete button without activating the course', () => {
        const ctx = renderInfo(false);
        fireEvent.click(screen.getByLabelText('Delete Row'));
        expect(ctx.removeCourseFromDisplay1).toHaveBeenCalledWith(7);
        expect(ctx.setAsActiveCourse).not.toHaveBeenCalled();
    });
});
