import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppContext } from '../contexts/AppContext';
import InfoPage from './InfoPage';

// The information page is about the database rather than made of it, so it is
// readable at any point in the download and carries the wait with it.
function renderWith(state) {
  return render(
    <MemoryRouter>
      <AppContext.Provider value={state}>
        <InfoPage />
      </AppContext.Provider>
    </MemoryRouter>
  );
}

const midDownload = {
  appLoading: true,
  dbError: null,
  loadingProgress: 40,
  loadingMessage: 'Downloading database...',
};

describe('the information page while the database is still coming down', () => {
  it('reads in full before the database has arrived', () => {
    renderWith(midDownload);
    expect(screen.getByRole('heading', { name: 'Information/Data' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Main Page' })).toBeInTheDocument();
  });

  it('carries a live copy of the bar, under the way back', () => {
    const { container } = renderWith(midDownload);
    const bar = container.querySelector('.info-loading-bar .progress-bar');
    expect(bar).toHaveStyle({ transform: 'scaleX(0.4)' });
    expect(screen.getByText('Downloading database...')).toBeInTheDocument();

    const header = container.querySelector('.info-header');
    const link = screen.getByRole('link', { name: 'Back to Main Page' });
    expect(header.contains(link)).toBe(true);
    expect(
      link.compareDocumentPosition(container.querySelector('.info-loading-bar'))
        & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('follows the number the main page is showing, not one of its own', () => {
    const { container } = renderWith({ ...midDownload, loadingProgress: 99 });
    expect(container.querySelector('.info-loading-bar .progress-bar'))
      .toHaveStyle({ transform: 'scaleX(0.99)' });
  });

  it('drops the bar once the wait is over', () => {
    const { container } = renderWith({
      appLoading: false, dbError: null, loadingProgress: 100, loadingMessage: 'Ready',
    });
    expect(container.querySelector('.info-loading-bar')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Information/Data' })).toBeInTheDocument();
  });

  it('drops the bar when the download has failed, rather than leaving it stuck', () => {
    const { container } = renderWith({
      appLoading: true, dbError: new Error('no'), loadingProgress: 40, loadingMessage: 'x',
    });
    expect(container.querySelector('.info-loading-bar')).toBeNull();
  });
});
