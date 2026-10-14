import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppContext } from './contexts/AppContext';
import App from './APP';

// Only the layout is under test here, so every panel is left empty.
// Both ship an `exports` map only, which the jest of react-scripts cannot read.
jest.mock('@vercel/analytics/react', () => ({ Analytics: () => null }), { virtual: true });
jest.mock('@vercel/speed-insights/react', () => ({ SpeedInsights: () => null }), { virtual: true });
jest.mock('react-dnd', () => ({ DndProvider: ({ children }) => children }));
jest.mock('react-dnd-html5-backend', () => ({ HTML5Backend: {} }));
// The library ships only as ES modules. Its handle renders as a separator and
// passes every other prop to the element, which is what this stands in for.
jest.mock('react-resizable-panels', () => ({
    PanelGroup: ({ children }) => <div>{children}</div>,
    Panel: ({ children }) => <div>{children}</div>,
    PanelResizeHandle: (props) => <div role="separator" aria-label={props['aria-label']} />,
}));
jest.mock('./tutorial/TutorialProvider', () => ({ children }) => children);
jest.mock('./components/shared/Header', () => () => null);
jest.mock('./components/CourseSelector/CourseSelector', () => () => null);
jest.mock('./components/CourseDisplay1/CourseDisplay1', () => () => null);
jest.mock('./components/CourseDisplay2/CourseDisplay2', () => () => null);
jest.mock('./components/CourseDetails/CourseDetails', () => () => null);

describe('the desktop layout', () => {
    it('names every handle that resizes the panels', () => {
        window.history.pushState({}, '', '/');
        render(
            <AppContext.Provider value={{ appLoading: false, dbError: null }}>
                <App />
            </AppContext.Provider>
        );

        expect(screen.getByRole('separator', { name: 'Resize the left and right sides' })).toBeInTheDocument();
        expect(screen.getByRole('separator', { name: 'Resize the course list and the course details' })).toBeInTheDocument();
        expect(screen.getByRole('separator', { name: 'Resize Course Display 1 and Course Display 2' })).toBeInTheDocument();
    });
});
