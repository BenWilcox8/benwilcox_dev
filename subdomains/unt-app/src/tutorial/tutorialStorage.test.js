import { forgetTutorial, hasSeenTutorial, markTutorialSeen } from './tutorialStorage';

describe('the first-visit record', () => {
  afterEach(() => forgetTutorial());

  it('starts empty on a freshly loaded page', () => {
    expect(hasSeenTutorial()).toBe(false);
  });

  it('remembers within the loaded page, which is what a route change is', () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
  });

  it('writes nothing to storage, so a new page load starts over', () => {
    const before = { ...window.localStorage };
    markTutorialSeen();
    expect({ ...window.localStorage }).toEqual(before);
    expect(window.sessionStorage.length).toBe(0);
  });
});
