import React, { useCallback, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Specifier from './Specifier';

const parseSemester = (text) => text;

const SemesterSpecifier = () => {
    const { allRelevantSemesters, activeSemesters, setActiveSemesters } = useContext(AppContext);

    const handleSemesterChange = useCallback((semester) => {
        setActiveSemesters(prev => (
            prev.includes(semester) ? prev.filter(s => s !== semester) : [...prev, semester]
        ));
    }, [setActiveSemesters]);

    // NOTE: the list keeps the order the offerings arrive in. The sort that
    // used to sit here read `s.specific_semester`, while the parsed CSV column
    // is `Specific Semester`, so every order was undefined and the sort never
    // ran. Putting the list into mapping order changes what the user sees, so
    // it waits on the captain. See the c108 audit report, finding 6.

    return (
        <Specifier
            title="Semesters"
            idPrefix="semester"
            items={allRelevantSemesters}
            selected={activeSemesters}
            onToggle={handleSemesterChange}
            onSelect={setActiveSemesters}
            parseLabel={parseSemester}
        />
    );
};

export default SemesterSpecifier;
