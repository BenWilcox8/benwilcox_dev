import React, { useCallback, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import Specifier from './Specifier';

const parseYear = (text) => parseInt(text, 10);

const YearSpecifier = () => {
    const { allRelevantYears, activeYears, setActiveYears } = useContext(AppContext);

    const handleYearChange = useCallback((year) => {
        setActiveYears(prev => (
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year]
        ));
    }, [setActiveYears]);

    return (
        <Specifier
            title="Years"
            idPrefix="year"
            items={allRelevantYears}
            selected={activeYears}
            onToggle={handleYearChange}
            onSelect={setActiveYears}
            parseLabel={parseYear}
        />
    );
};

export default YearSpecifier;
