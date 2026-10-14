import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { AppContext } from '../contexts/AppContext';
import SearchCourses from './CourseSelector/SearchCourses';
import CourseItem from './CourseSelector/CourseItem';
import CourseGroupSelector from './CourseSelector/CourseGroupSelector';
import CourseInfo from './CourseDisplay1/CourseInfo';
import SemesterBar from './CourseDisplay1/SemesterView/SemesterBar';
import SemesterViewHeader from './CourseDisplay1/SemesterView/SemesterViewHeader';
import Specifier from './CourseDisplay2/Specifier';
import ResizeHandle from './shared/ResizeHandle';

// Every control of the app has a name a screen reader can announce, and every
// element that acts as a button can be reached and used from the keyboard.
// These tests find each control the way assistive technology does: by role and
// accessible name.

jest.mock('../utils/dataUtils', () => ({
    fetchAllCatalogForCourse: jest.fn(),
    fetchOfferingCountsForCourse: jest.fn(),
    fetchCourseData: jest.fn(),
}));

const dataUtils = jest.requireMock('../utils/dataUtils');

const course = { main_course_id: 7, course_code: 'CSCE 1030', course_name: 'Computer Science I' };

const renderWith = (value, ui) => render(
    <AppContext.Provider value={value}>{ui}</AppContext.Provider>
);

const press = (element, key) => {
    fireEvent.keyDown(element, { key });
    fireEvent.keyUp(element, { key });
};

describe('Course Selector', () => {
    it('names the search box and its clear button', () => {
        const handleSearch = jest.fn();
        renderWith({ handleSearch }, <SearchCourses />);

        const search = screen.getByRole('textbox', { name: 'Search courses' });
        fireEvent.change(search, { target: { value: 'csce' } });
        fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

        expect(handleSearch).toHaveBeenLastCalledWith('');
        expect(search).toHaveValue('');
    });

    it('adds a course to Course Display 1 from the keyboard', () => {
        const addCourseToDisplay1 = jest.fn();
        renderWith({ addCourseToDisplay1, togglePin: jest.fn(), pinnedCourses: [] }, <CourseItem course={course} />);

        const add = screen.getByRole('button', { name: 'Add CSCE 1030 - Computer Science I to Course Display 1' });
        press(add, 'Enter');
        press(add, ' ');

        expect(addCourseToDisplay1).toHaveBeenCalledTimes(2);
        expect(addCourseToDisplay1).toHaveBeenCalledWith(course);
    });

    it('names the pin button and reports whether the course is pinned', () => {
        const togglePin = jest.fn();
        const addCourseToDisplay1 = jest.fn();
        renderWith({ addCourseToDisplay1, togglePin, pinnedCourses: [course] }, <CourseItem course={course} />);

        fireEvent.click(screen.getByRole('button', { name: 'Pin CSCE 1030', pressed: true }));

        expect(togglePin).toHaveBeenCalledWith(course);
        expect(addCourseToDisplay1).not.toHaveBeenCalled();
    });

    it('shows the pin of an unpinned course while the keyboard is in its row', () => {
        renderWith({ addCourseToDisplay1: jest.fn(), togglePin: jest.fn(), pinnedCourses: [] }, <CourseItem course={course} />);
        expect(screen.queryByRole('button', { name: 'Pin CSCE 1030' })).toBeNull();

        const add = screen.getByRole('button', { name: /^Add CSCE 1030/ });
        act(() => { add.focus(); });
        const pin = screen.getByRole('button', { name: 'Pin CSCE 1030', pressed: false });

        // Moving from the course name to the pin keeps the pin on screen.
        act(() => { pin.focus(); });
        expect(screen.getByRole('button', { name: 'Pin CSCE 1030' })).toBe(pin);

        act(() => { pin.blur(); });
        expect(screen.queryByRole('button', { name: 'Pin CSCE 1030' })).toBeNull();
    });

    it('names each course group checkbox after its catalog', async () => {
        dataUtils.fetchAllCatalogForCourse.mockResolvedValue([{
            main_catalog_id: 3,
            catalog_year: '2015',
            catalog_type: 'Undergraduate Catalog',
            course_link: 'https://catalog.unt.edu/x',
            course_code: 'CSCE 1030',
            course_name: 'Computer Science I',
        }]);
        dataUtils.fetchOfferingCountsForCourse.mockResolvedValue(new Map([[3, 4]]));
        const setCourseGroupSelection = jest.fn();
        renderWith({
            db: {},
            activeCourse: course,
            courseGroupSelection: { 3: true },
            setCourseGroupSelection,
            includeFormerProfessors: true,
        }, <CourseGroupSelector />);

        const box = await screen.findByRole('checkbox', { name: 'Include 2015-2016 Undergraduate Catalog' });
        expect(box).toBeChecked();
        fireEvent.click(box);
        expect(setCourseGroupSelection).toHaveBeenCalled();
    });
});

describe('Course Display 1', () => {
    it('names the delete button and makes the course name a toggle button', () => {
        const setAsActiveCourse = jest.fn();
        const removeCourseFromDisplay1 = jest.fn();
        renderWith({
            setAsActiveCourse,
            removeCourseFromDisplay1,
            restoreFullSelection: jest.fn(),
            yearsAllSelected: true,
            semestersAllSelected: true,
        }, <CourseInfo course={course} isSelected={false} />);

        press(screen.getByRole('button', { name: 'CSCE 1030 Computer Science I', pressed: false }), ' ');
        expect(setAsActiveCourse).toHaveBeenCalledWith(course);

        fireEvent.click(screen.getByRole('button', { name: 'Delete CSCE 1030 row' }));
        expect(removeCourseFromDisplay1).toHaveBeenCalledWith(7);
    });

    it('names a semester bar after its course, semester, year and count', () => {
        const setAsActiveCourse = jest.fn();
        const offerings = [{ specific_semester: 'Fall' }, { specific_semester: 'Fall' }];
        renderWith({ granularView: false, showCourseCount: true, setAsActiveCourse },
            <SemesterBar course={course} year={2020} broadSemester="Fall"
                offeringsForSemester={offerings} specificSemesterTypes={['Fall']} />);

        press(screen.getByRole('button', { name: 'CSCE 1030 Fall 2020, 2 offerings' }), 'Enter');
        expect(setAsActiveCourse).toHaveBeenCalledWith(course, 2020, ['Fall']);
    });

    it('names each bar of the granular view', () => {
        const setAsActiveCourse = jest.fn();
        const offerings = [{ specific_semester: 'Summer 10W' }];
        renderWith({ granularView: true, showCourseCount: true, setAsActiveCourse },
            <SemesterBar course={course} year={2021} broadSemester="Summer"
                offeringsForSemester={offerings} specificSemesterTypes={['Summer 5W1', 'Summer 10W']} />);

        expect(screen.getByRole('button', { name: 'CSCE 1030 Summer 5W1 2021, 0 offerings' })).toBeInTheDocument();
        press(screen.getByRole('button', { name: 'CSCE 1030 Summer 10W 2021, 1 offerings' }), 'Enter');
        expect(setAsActiveCourse).toHaveBeenCalledTimes(1);
        expect(setAsActiveCourse).toHaveBeenCalledWith(course, 2021, 'Summer 10W');
    });

    it('names each year header', () => {
        const setActiveYears = jest.fn();
        renderWith({
            coursesInDisplay1: [],
            displayYears: [2020, 2021],
            yearMarkers: [],
            setActiveYears,
            setActiveSemesters: jest.fn(),
        }, <SemesterViewHeader />);

        press(screen.getByRole('button', { name: 'Show 2021 offerings' }), 'Enter');
        expect(setActiveYears).toHaveBeenCalledWith([2021]);
    });

    // A real button clicks on the Space keyup, and not at all when its keydown
    // was cancelled, which is how the tutorial takes Space for its next step.
    it('clicks on Space only when its keydown was not cancelled', () => {
        const setAsActiveCourse = jest.fn();
        renderWith({ granularView: false, showCourseCount: true, setAsActiveCourse },
            <SemesterBar course={course} year={2020} broadSemester="Fall"
                offeringsForSemester={[]} specificSemesterTypes={[]} />);
        const bar = screen.getByRole('button', { name: 'CSCE 1030 Fall 2020, 0 offerings' });

        fireEvent.keyDown(bar, { key: ' ' });
        expect(setAsActiveCourse).not.toHaveBeenCalled();
        fireEvent.keyUp(bar, { key: ' ' });
        expect(setAsActiveCourse).toHaveBeenCalledTimes(1);

        const cancel = (event) => event.preventDefault();
        window.addEventListener('keydown', cancel);
        press(bar, ' ');
        window.removeEventListener('keydown', cancel);
        expect(setAsActiveCourse).toHaveBeenCalledTimes(1);
    });

    it('does not scroll the page on Space', () => {
        renderWith({ granularView: false, showCourseCount: true, setAsActiveCourse: jest.fn() },
            <SemesterBar course={course} year={2020} broadSemester="Fall"
                offeringsForSemester={[]} specificSemesterTypes={[]} />);
        const bar = screen.getByRole('button', { name: 'CSCE 1030 Fall 2020, 0 offerings' });

        expect(fireEvent.keyPress(bar, { key: ' ', charCode: 32 })).toBe(false);
    });
});

describe('Course Display 2', () => {
    it('names the heading that selects or clears a whole box', () => {
        const onSelect = jest.fn();
        const { rerender } = render(
            <Specifier title="Years" idPrefix="year" items={[2020, 2021]} selected={[2020]}
                onToggle={jest.fn()} onSelect={onSelect} parseLabel={Number} />
        );
        press(screen.getByRole('button', { name: 'Clear all Years' }), 'Enter');
        expect(onSelect).toHaveBeenLastCalledWith([]);

        rerender(
            <Specifier title="Years" idPrefix="year" items={[2020, 2021]} selected={[]}
                onToggle={jest.fn()} onSelect={onSelect} parseLabel={Number} />
        );
        press(screen.getByRole('button', { name: 'Select all Years' }), ' ');
        expect(onSelect).toHaveBeenLastCalledWith([2020, 2021]);
        expect(screen.getByRole('checkbox', { name: '2021' })).not.toBeChecked();
    });
});

describe('ResizeHandle', () => {
    it('is named and can be moved from the keyboard', () => {
        const Wrapper = () => {
            const [width, setWidth] = React.useState(150);
            return (
                <ResizeHandle className="handle" label="Resize the year and semester filters"
                    width={width} setWidth={setWidth} position={(w) => w} getMaxWidth={() => 400} />
            );
        };
        render(<Wrapper />);

        const handle = screen.getByRole('separator', { name: 'Resize the year and semester filters' });
        expect(handle).toHaveAttribute('tabindex', '0');
        expect(handle).toHaveAttribute('aria-valuenow', '150');
        expect(handle).toHaveAttribute('aria-valuemax', '400');
        expect(handle).toHaveAttribute('aria-valuetext', '150 pixels');

        press(handle, 'ArrowRight');
        expect(handle).toHaveAttribute('aria-valuenow', '160');
        press(handle, 'End');
        expect(handle).toHaveAttribute('aria-valuenow', '400');
        press(handle, 'Home');
        expect(handle).toHaveAttribute('aria-valuenow', '0');
    });
});
