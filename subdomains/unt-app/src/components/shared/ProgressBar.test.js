import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

// The fill is a transform rather than a width so that the compositor can
// carry it to its target while the main thread is busy with the work after
// the download. These check the number reaching the style, which is what that
// depends on.
describe('the loading bar', () => {
  function fill(container) {
    return container.querySelector('.progress-bar');
  }

  it('scales the fill to the share of the wait that is done', () => {
    const { container } = render(<ProgressBar progress={62.5} />);
    expect(fill(container)).toHaveStyle({ transform: 'scaleX(0.625)' });
  });

  it('is empty at nothing and full at a hundred', () => {
    const { container: none } = render(<ProgressBar progress={0} />);
    expect(fill(none)).toHaveStyle({ transform: 'scaleX(0)' });
    const { container: all } = render(<ProgressBar progress={100} />);
    expect(fill(all)).toHaveStyle({ transform: 'scaleX(1)' });
  });

  it('never draws past either end of the bar', () => {
    const { container: over } = render(<ProgressBar progress={140} />);
    expect(fill(over)).toHaveStyle({ transform: 'scaleX(1)' });
    const { container: under } = render(<ProgressBar progress={-20} />);
    expect(fill(under)).toHaveStyle({ transform: 'scaleX(0)' });
  });

  it('treats a missing number as the start of the wait', () => {
    const { container } = render(<ProgressBar />);
    expect(fill(container)).toHaveStyle({ transform: 'scaleX(0)' });
  });

  it('shows the stage it was given, and no empty line when it has none', () => {
    const { container: quiet } = render(<ProgressBar progress={10} />);
    expect(quiet.querySelector('.progress-message')).toBeNull();
    render(<ProgressBar progress={10} message="Downloading database..." />);
    expect(screen.getByText('Downloading database...')).toBeInTheDocument();
  });

  it('takes a class so the same bar can sit in a smaller place', () => {
    const { container } = render(<ProgressBar progress={10} className="progress-compact" />);
    expect(container.querySelector('.progress-container')).toHaveClass('progress-compact');
  });
});
