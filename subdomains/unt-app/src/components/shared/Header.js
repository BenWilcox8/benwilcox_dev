import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AppContext } from '../../contexts/AppContext';
import { TutorialContext } from '../../tutorial/TutorialContext';
import { LAST_UPDATED_DATE, LAST_UPDATED_SEMESTER } from '../../config';
import { FiShare2 } from 'react-icons/fi';
import './Header.css';
import useIsMobile from '../../hooks/useIsMobile';

const Header = () => {
    const { 
        autoPin,
        showCourseGroups,
        showCourseCount,
        showAllYears,
        granularView,
        pinnedCourses,
        coursesInDisplay1,
        activeCourse
    } = useContext(AppContext);
    const isMobile = useIsMobile(900);
    // Null wherever the tutorial is not mounted, such as the mobile layout.
    const { active: tutorialActive, restart: restartTutorial } = useContext(TutorialContext);
    
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const params = new URLSearchParams();
        // Share the host the reader is already on. A fixed host sent every
        // link to one domain, whatever the reader was using.
        const baseUrl = `${window.location.origin}/`;

        // --- Determine Default State ---
        const defaultSettings = {
            autoPin: true,
            showCourseGroups: false,
            showCourseCount: true,
            showAllYears: true,
            granularView: false,
        };
        const defaultSettingsInt = (defaultSettings.autoPin ? 1 : 0) |
                                   (defaultSettings.showCourseGroups ? 2 : 0) |
                                   (defaultSettings.showCourseCount ? 4 : 0) |
                                   (defaultSettings.showAllYears ? 8 : 0) |
                                   (defaultSettings.granularView ? 16 : 0);

        // --- Compare Current State to Default and Build URL ---
        // 1. Settings
        const currentSettingsInt = (autoPin ? 1 : 0) |
                                   (showCourseGroups ? 2 : 0) |
                                   (showCourseCount ? 4 : 0) |
                                   (showAllYears ? 8 : 0) |
                                   (granularView ? 16 : 0);

        if (currentSettingsInt !== defaultSettingsInt) {
            params.set('settings', currentSettingsInt);
        }

        // 2. Pinned Courses
        if (pinnedCourses.length > 0) {
            params.set('pinned', pinnedCourses.map(c => c.main_course_id).join(','));
        }

        // 3. Displayed Courses
        if (coursesInDisplay1.length > 0) {
            params.set('courses', coursesInDisplay1.map(c => c.main_course_id).join(','));
        }

        // 4. Active Course
        if (activeCourse) {
            params.set('active', activeCourse.main_course_id);
        }

        const queryString = params.toString();
        const shareUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

        // Only report success after the write succeeds. A browser that refuses
        // the clipboard gets a box the reader can copy from.
        const write = navigator.clipboard
            ? navigator.clipboard.writeText(shareUrl)
            : Promise.reject(new Error('clipboard unavailable'));

        write.then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            window.prompt('Copy this link', shareUrl);
        });
    };

    if (isMobile) {
        return (
            <div className="header-container header-mobile">
                <div className="header-title">UNT Historical Courses</div>
                <div className="header-row">
                    <div className="header-section left">
                        <div>
                            Created by <a href="https://www.linkedin.com/in/benwilcox2005/" target="_blank" rel="noopener noreferrer">Ben Wilcox</a>
                            <br />
                            Updated {LAST_UPDATED_DATE} ({LAST_UPDATED_SEMESTER})
                        </div>
                    </div>
                    <div className="header-section right">
                        <div className="top-right">
                            <Link to="/info">Info/Data</Link>
                            <button onClick={handleShare} className="share-button-header" title="Copy Share Link">
                                {copied ? 'Copied!' : 'Share'} <FiShare2 />
                            </button>
                        </div>
                        <div className="bottom-right">
                            <a href="https://buymeacoffee.com/benwilcox" target="_blank" rel="noopener noreferrer">Support Me</a>
                            <a href="mailto:benjaminwilcox@my.unt.edu">Contact</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="header-container">
            <div className="header-section left">
                <div>
                    Created by <a href="https://www.linkedin.com/in/benwilcox2005/" target="_blank" rel="noopener noreferrer">Ben Wilcox</a>
                    <br />
                        Updated {LAST_UPDATED_DATE} ({LAST_UPDATED_SEMESTER})
                </div>
            </div>
            <div className="header-section middle">
                UNT Historical Courses
            </div>
            <div className="header-section right">
                <div className="top-right">
                    {restartTutorial && (
                        <button
                            onClick={restartTutorial}
                            className="tutorial-header-link"
                            data-tutorial-control="restart"
                            title="Replay the tutorial"
                        >
                            Tutorial
                        </button>
                    )}
                    {tutorialActive ? (
                        // Following this link during the tutorial would leave
                        // the page the tutorial is running on, and the tutorial
                        // with it. For as long as it is running, the link opens
                        // beside the app instead of replacing it.
                        <a href="/info" target="_blank" rel="noopener noreferrer">Info/Data</a>
                    ) : (
                        <Link to="/info">Info/Data</Link>
                    )}
                    <button onClick={handleShare} className="share-button-header" title="Copy Share Link">
                        {copied ? 'Copied!' : 'Share'} <FiShare2 />
                    </button>
                </div>
                <div className="bottom-right">
                    <a href="https://buymeacoffee.com/benwilcox" target="_blank" rel="noopener noreferrer">Support Me</a>
                    <a href="mailto:benjaminwilcox@my.unt.edu">Contact</a>
                </div>
            </div>
        </div>
    );
};

export default Header;