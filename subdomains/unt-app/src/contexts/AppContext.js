import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import Fuse from 'fuse.js';
import useDatabase from '../hooks/useDatabase';
import {
  fetchAllCourses,
  fetchCourseData,
  fetchAllCatalogForSearch
} from '../utils/dataUtils';
import { computeDisplayYears, sameYears } from '../utils/displayYears';
import { runMarkers } from '../utils/selectionMarkers';

export const AppContext = createContext();

const EMPTY_LIST = [];

// True when the active selection already holds every relevant value. An empty
// relevant set counts as fully selected: nothing is selectable, so a restore
// would change nothing, the name click deselects, and no markers are drawn.
export const coversAll = (relevant, active) => relevant.every(v => active.includes(v));

export const AppProvider = ({ children }) => {
  const { db, loading: dbLoading, progress: dbProgress } = useDatabase();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [semesterMapping, setSemesterMapping] = useState(EMPTY_LIST);
  const [appLoading, setAppLoading] = useState(true);

  // All Courses state
  const [allCourses, setAllCourses] = useState(EMPTY_LIST);
  const [mainCourseMap, setMainCourseMap] = useState(new Map());
  const [filteredCourses, setFilteredCourses] = useState(EMPTY_LIST);
  const [fuse, setFuse] = useState(null);

  // Pinned Courses
  const [pinnedCourses, setPinnedCourses] = useState(EMPTY_LIST);

  // Course Display 1 State
  const [coursesInDisplay1, setCoursesInDisplay1] = useState(EMPTY_LIST);

  // Active Course State (for Display 2)
  const [activeCourse, setActiveCourse] = useState(null);
  const [activeYears, setActiveYears] = useState(EMPTY_LIST);
  const [activeSemesters, setActiveSemesters] = useState(EMPTY_LIST);

  // UI Toggles
  const [autoPin, setAutoPin] = useState(true);
  const [showCourseGroups, setShowCourseGroups] = useState(false);
  const [granularView, setGranularView] = useState(false);
  const [showAllYears, setShowAllYears] = useState(true);
  const [showCourseCount, setShowCourseCount] = useState(true);

  // Course Group Selector State
  const [courseGroupSelection, setCourseGroupSelection] = useState({});

  // The year columns of Course Display 1, computed once for the whole display.
  const [displayYears, setDisplayYears] = useState(EMPTY_LIST);

  // URL State Hydration
  const [initializationDone, setInitializationDone] = useState(false);

  // --- ACTIVE COURSE LOGIC ---
  const activeCourseRun = useRef(0);
  const setAsActiveCourse = useCallback(async (course, year = null, semester = null) => {
    const run = ++activeCourseRun.current;
    if (!db || !course) {
        // No course is active, clear everything
        setActiveCourse(null);
        setActiveYears(EMPTY_LIST);
        setActiveSemesters(EMPTY_LIST);
        return;
    }

    setActiveCourse(course);
    const { catalog, offerings } = await fetchCourseData(db, course.main_course_id);
    if (run !== activeCourseRun.current) return; // a newer activation superseded this one
    setActiveCourse({ ...course, catalog, offerings });

    if (year !== null && semester !== null) {
        // A specific semester bar was clicked
        setActiveYears([year]);
        setActiveSemesters(Array.isArray(semester) ? semester : [semester]);
    } else {
        // General activation (e.g., clicking course info)
        // Enable all relevant years and semesters
        setActiveYears([...new Set(offerings.map(o => o.year))].sort((a, b) => b - a));
        setActiveSemesters([...new Set(offerings.map(o => o.specific_semester))]);
    }
  }, [db]);

  // --- DATA LOADING ---
  useEffect(() => {
    // Load semester_mapping.csv
    Papa.parse('/semester_mapping.csv', {
      download: true,
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const sortedMapping = results.data.sort((a, b) => a['Semester Order'] - b['Semester Order']);
        setSemesterMapping(sortedMapping);
      },
    });
  }, []);

  useEffect(() => {
    if (db) {
      const initializeSearch = async () => {
        setLoadingMessage('Loading courses...');
        setLoadingProgress(10);
        // step fetch courses
        const courses = await fetchAllCourses(db);
        setLoadingProgress(30);
        // 1. Fetch all main courses and create a lookup map
        const courseMap = new Map();
        courses.forEach(course => {
          courseMap.set(course.main_course_id, course);
        });
        setAllCourses(courses);
        setFilteredCourses(courses);
        setMainCourseMap(courseMap);

        setLoadingMessage('Fetching catalog data...');
        setLoadingProgress(50);
        // 2. Fetch all unique catalog entries for searching
        const allCatalogForSearch = await fetchAllCatalogForSearch(db);

        setLoadingMessage('Building search index...');
        setLoadingProgress(75);
        // 3. Create the combined and pre-processed search index for Fuse.js
        const searchData = new Map();
        const processText = (text) => text.replace(/ - /g, ' ');

        // Add current course name/code combinations
        courses.forEach(c => {
            const searchText = processText(`${c.course_code} ${c.course_name}`);
            searchData.set(c.main_course_id, new Set([searchText]));
        });

        // Add historical course name/code combinations
        allCatalogForSearch.forEach(c => {
            const searchText = processText(`${c.course_code} ${c.course_name}`);
            if (searchData.has(c.main_course_id)) {
                searchData.get(c.main_course_id).add(searchText);
            } else {
                searchData.set(c.main_course_id, new Set([searchText]));
            }
        });

        // Convert the map to an array of objects for Fuse
        const searchIndex = Array.from(searchData.entries()).map(([id, strings]) => ({
            main_course_id: id,
            searchStrings: Array.from(strings)
        }));

        const fuseInstance = new Fuse(searchIndex, {
          keys: ['searchStrings'],
          includeScore: true,
          threshold: 0.1, // Stricter search to reduce fuzzy matches
          ignoreLocation: true,
          findAllMatches: true,
        });
        setFuse(fuseInstance);
        setLoadingProgress(100);
        setLoadingMessage('Initialization complete');
        setAppLoading(false);
      };
      initializeSearch();
    }
  }, [db]);

  // --- COURSE DISPLAY 1 YEAR COLUMNS ---
  // One computation for the whole display. Every row reads the result.
  const displayYearsRun = useRef(0);
  useEffect(() => {
    if (!db) return;
    const run = ++displayYearsRun.current;
    const compute = async () => {
      const courseData = await Promise.all(
        coursesInDisplay1.map(c => fetchCourseData(db, c.main_course_id))
      );
      if (run !== displayYearsRun.current) return; // a newer run superseded this one
      const years = computeDisplayYears(courseData, showAllYears);
      setDisplayYears(prev => (sameYears(prev, years) ? prev : years));
    };
    compute().catch(e => {
      console.error("Display years computation failed:", e);
    });
  }, [db, showAllYears, coursesInDisplay1]);

  // --- URL STATE HYDRATION ---
  useEffect(() => {
    if (db && fuse && mainCourseMap.size > 0 && !initializationDone) {
      const params = new URLSearchParams(window.location.search);

      const settingsParam = params.get('settings');
      const pinnedParam = params.get('pinned');
      const coursesParam = params.get('courses');
      const activeParam = params.get('active');

      // 1. Handle settings from URL
      if (settingsParam) {
        const settingsInt = parseInt(settingsParam, 10);
        if (!isNaN(settingsInt)) {
          setAutoPin(!!(settingsInt & 1));
          setShowCourseGroups(!!(settingsInt & 2));
          setShowCourseCount(!!(settingsInt & 4));
          setShowAllYears(!!(settingsInt & 8));
          setGranularView(!!(settingsInt & 16));
        }
      }

      // 2. Handle pinned courses from URL
      if (pinnedParam) {
        const pinnedIds = pinnedParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        const coursesToPin = pinnedIds.map(id => mainCourseMap.get(id)).filter(Boolean);
        setPinnedCourses(coursesToPin);
      }

      // 3. Handle courses in display 1 from URL
      if (coursesParam) {
        const courseIds = coursesParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        const coursesToDisplay = courseIds.map(id => mainCourseMap.get(id)).filter(Boolean);
        setCoursesInDisplay1(coursesToDisplay);
      }

      // 4. Handle active course from URL
      if (activeParam) {
        const activeId = parseInt(activeParam, 10);
        if (!isNaN(activeId)) {
          const courseToActivate = mainCourseMap.get(activeId);
          if (courseToActivate) {
            setAsActiveCourse(courseToActivate);
          }
        }
      }

      setInitializationDone(true);
    }
  }, [db, fuse, mainCourseMap, initializationDone, setAsActiveCourse]);

  // --- SEARCH LOGIC ---
  const handleSearch = useCallback((term) => {
    if (!term) {
      setFilteredCourses(allCourses);
      return;
    }
    if (fuse) {
      const processedTerm = term.replace(/ - /g, ' ');
      const results = fuse.search(processedTerm);

      // Get unique main_course_ids from results
      const uniqueMainCourseIds = [...new Set(results.map(result => result.item.main_course_id))];

      // Map back to full MainCourse objects
      const matchedCourses = uniqueMainCourseIds
        .map(id => mainCourseMap.get(id))
        .filter(Boolean); // filter(Boolean) removes any undefined if a course isn't found

      setFilteredCourses(matchedCourses);
    }
  }, [fuse, allCourses, mainCourseMap]);


  // --- COURSE DISPLAY 1 LOGIC ---
  const addCourseToDisplay1 = useCallback((course) => {
    if (coursesInDisplay1.some(c => c.main_course_id === course.main_course_id)) return;
    setCoursesInDisplay1(prev => [...prev, course]);
    if (autoPin) {
      setPinnedCourses(prev =>
        prev.some(p => p.main_course_id === course.main_course_id) ? prev : [...prev, course]);
    }
    setAsActiveCourse(course);
  }, [coursesInDisplay1, autoPin, setAsActiveCourse]);

  const removeCourseFromDisplay1 = useCallback((courseId) => {
    setCoursesInDisplay1(prev => prev.filter(c => c.main_course_id !== courseId));
    if (activeCourse && activeCourse.main_course_id === courseId) {
      // The filters belong to the course that just left the display.
      setActiveCourse(null);
      setActiveYears(EMPTY_LIST);
      setActiveSemesters(EMPTY_LIST);
    }
  }, [activeCourse]);

  const reorderCoursesInDisplay1 = useCallback((dragIndex, hoverIndex) => {
    setCoursesInDisplay1(prev => {
      const next = [...prev];
      const [dragged] = next.splice(dragIndex, 1);
      next.splice(hoverIndex, 0, dragged);
      return next;
    });
  }, []);


  // --- PINNING LOGIC ---
  const togglePin = useCallback((course) => {
    setPinnedCourses(prev => {
      const isPinned = prev.find(p => p.main_course_id === course.main_course_id);
      if (isPinned) {
        return prev.filter(p => p.main_course_id !== course.main_course_id);
      } else {
        return [...prev, course];
      }
    });
  }, []);

  // --- FULL SELECTION FOR THE ACTIVE COURSE ---
  // The years and specific semesters the active course can show, after the
  // Course Group Selector. YearSpecifier, SemesterSpecifier, the Course
  // Display 1 selection markers and the course-name click all read these.
  const { allRelevantYears, allRelevantSemesters } = useMemo(() => {
    const offerings = activeCourse?.offerings;
    if (!offerings) return { allRelevantYears: EMPTY_LIST, allRelevantSemesters: EMPTY_LIST };

    const catalog = activeCourse.catalog || EMPTY_LIST;
    const selectedIds = new Set(
      catalog.filter(c => courseGroupSelection[c.main_catalog_id] !== false)
             .map(c => c.main_catalog_id));
    if (selectedIds.size === 0) {
      return { allRelevantYears: EMPTY_LIST, allRelevantSemesters: EMPTY_LIST };
    }

    const selected = selectedIds.size === catalog.length
      ? offerings
      : offerings.filter(o => selectedIds.has(o.main_catalog_id));

    return {
      allRelevantYears: [...new Set(selected.map(o => o.year))].sort((a, b) => b - a),
      allRelevantSemesters: [...new Set(selected.map(o => o.specific_semester))],
    };
  }, [activeCourse, courseGroupSelection]);

  const yearsAllSelected = coversAll(allRelevantYears, activeYears);
  const semestersAllSelected = coversAll(allRelevantSemesters, activeSemesters);

  // Which year columns of Course Display 1 carry a selection marker, in the
  // order of `displayYears`. The marker spans the whole column - the header
  // and every course row - so the runs are computed once here rather than per
  // row. A full selection, and an empty selectable set, draw nothing.
  const yearMarkers = useMemo(
    () => runMarkers(displayYears, year => !yearsAllSelected && activeYears.includes(year)),
    [displayYears, yearsAllSelected, activeYears]);

  // Put every year and semester of the active course back on.
  const restoreFullSelection = useCallback(() => {
    setActiveYears(allRelevantYears);
    setActiveSemesters(allRelevantSemesters);
  }, [allRelevantYears, allRelevantSemesters]);

  // new effect to sync progress
  useEffect(() => {
    if (dbLoading) {
      setLoadingMessage('Downloading database...');
      setLoadingProgress(dbProgress * 0.5); // 0-50
    }
  }, [dbLoading, dbProgress]);

  const value = useMemo(() => ({
    db,
    dbLoading,
    dbProgress,
    loadingProgress,
    loadingMessage,
    semesterMapping,
    allCourses,
    filteredCourses,
    handleSearch,
    pinnedCourses,
    togglePin,
    coursesInDisplay1,
    addCourseToDisplay1,
    removeCourseFromDisplay1,
    reorderCoursesInDisplay1,
    displayYears,
    activeCourse,
    setAsActiveCourse,
    activeYears,
    setActiveYears,
    activeSemesters,
    setActiveSemesters,
    allRelevantYears,
    allRelevantSemesters,
    yearsAllSelected,
    yearMarkers,
    semestersAllSelected,
    restoreFullSelection,
    autoPin,
    setAutoPin,
    showCourseGroups,
    setShowCourseGroups,
    granularView,
    setGranularView,
    showAllYears,
    setShowAllYears,

    showCourseCount,
    setShowCourseCount,
    courseGroupSelection,
    setCourseGroupSelection,
    appLoading,
  }), [
    db, dbLoading, dbProgress, loadingProgress, loadingMessage, semesterMapping,
    allCourses, filteredCourses, handleSearch, pinnedCourses, togglePin,
    coursesInDisplay1, addCourseToDisplay1, removeCourseFromDisplay1,
    reorderCoursesInDisplay1, displayYears, activeCourse, setAsActiveCourse,
    activeYears, activeSemesters, allRelevantYears, allRelevantSemesters,
    yearsAllSelected, semestersAllSelected, yearMarkers, restoreFullSelection,
    autoPin, showCourseGroups, granularView, showAllYears, showCourseCount,
    courseGroupSelection, appLoading,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
