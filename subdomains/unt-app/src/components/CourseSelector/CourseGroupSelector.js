import React, { useContext, useEffect, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { fetchAllCatalogForCourse, fetchOfferingsCountForCatalog } from '../../utils/dataUtils';

const CourseGroupSelector = () => {
    const { db, activeCourse, courseGroupSelection, setCourseGroupSelection } = useContext(AppContext);
    const [catalogEntries, setCatalogEntries] = useState([]);

    useEffect(() => {
        if (db && activeCourse) {
            const loadData = async () => {
                const catalogs = await fetchAllCatalogForCourse(db, activeCourse.main_course_id);
                const catalogsWithCounts = await Promise.all(catalogs.map(async (cat) => {
                    const count = await fetchOfferingsCountForCatalog(db, cat.main_catalog_id);
                    return { ...cat, offeringCount: count };
                }));
                
                // Sort by catalog_year descending
                catalogsWithCounts.sort((a, b) => b.catalog_year - a.catalog_year);
                
                setCatalogEntries(catalogsWithCounts);
                
                // Only initialize selections for new entries that don't already have a selection
                setCourseGroupSelection(prev => {
                    const newSelection = { ...prev };
                    catalogs.forEach(cat => {
                        if (!(cat.main_catalog_id in newSelection)) {
                            newSelection[cat.main_catalog_id] = true;
                        }
                    });
                    return newSelection;
                });
            };
            loadData();
        } else {
            setCatalogEntries([]);
        }
    }, [db, activeCourse, setCourseGroupSelection]);

    const handleCheckboxChange = (catalogId) => {
        setCourseGroupSelection(prev => ({
            ...prev,
            [catalogId]: !prev[catalogId]
        }));
    };

    const handleEntryClick = (catalogId, e) => {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'a' || tag === 'input') {
            return; // Ignore clicks on link or checkbox itself
        }
        handleCheckboxChange(catalogId);
    };

    const handleSelectAll = () => {
        setCourseGroupSelection(prev => {
            const newSelection = { ...prev };
            catalogEntries.forEach(cat => {
                newSelection[cat.main_catalog_id] = true;
            });
            return newSelection;
        });
    };

    const handleDeselectAll = () => {
        setCourseGroupSelection(prev => {
            const newSelection = { ...prev };
            catalogEntries.forEach(cat => {
                newSelection[cat.main_catalog_id] = false;
            });
            return newSelection;
        });
    };

    if (!activeCourse) {
        return (
            <div className="flex items-center justify-center p-4 h-full text-gray-500">
                Select a course in Course Display 1 to see its groups.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-2 mb-2 border-b-2 border-gray-700 flex-shrink-0">
                <h2 className="font-bold text-lg truncate">{`${activeCourse.course_code} - ${activeCourse.course_name}`}</h2>
                <div className="selector-action-buttons">
                    <button onClick={handleSelectAll} className="show-groups-button">Select All</button>
                    <button onClick={handleDeselectAll} className="show-groups-button">Deselect All</button>
                </div>
            </div>
            <div className="overflow-y-auto">
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                    {catalogEntries.map((entry, index) => (
                        <li 
                          key={entry.main_catalog_id} 
                          className="py-2 px-1 cursor-pointer"
                          onClick={(e) => handleEntryClick(entry.main_catalog_id, e)}
                        >
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={!!courseGroupSelection[entry.main_catalog_id]}
                                    onChange={() => handleCheckboxChange(entry.main_catalog_id)}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <a 
                                    href={entry.course_link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:underline text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {`${entry.catalog_year}-${parseInt(entry.catalog_year, 10) + 1} ${entry.catalog_type}`}
                                </a>
                            </div>
                            <div className="pl-6 text-sm mt-1">
                                <strong className="text-base">{entry.course_code}</strong>
                                <br />
                                {entry.course_name}
                                <br />
                                Offerings: {entry.offeringCount}
                            </div>
                           {index < catalogEntries.length - 1 && <hr className="my-2" />}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default CourseGroupSelector;
