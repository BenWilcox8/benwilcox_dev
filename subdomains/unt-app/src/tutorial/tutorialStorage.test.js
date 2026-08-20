import { forgetTutorial, hasSeenTutorial, markTutorialSeen } from './tutorialStorage';

describe('the first-visit record (localStorage)', () => {
  afterEach(() => forgetTutorial());

  it('starts empty when localStorage has no flag', () => {
    expect(hasSeenTutorial()).toBe(false);
  });

  it('marks seen and reads it back', () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
  });

  it('writes the flag to localStorage so a new page load stays seen', () => {
    markTutorialSeen();
    expect(localStorage.getItem('tutorial-seen')).not.toBeNull();
  });

  it('forgetTutorial removes the localStorage flag', () => {
    markTutorialSeen();
    forgetTutorial();
    expect(hasSeenTutorial()).toBe(false);
    expect(localStorage.getItem('tutorial-seen')).toBeNull();
  });
});

describe('the first-visit record (localStorage blocked - memory fallback)', () => {
  let originalSetItem;
  let originalGetItem;
  let originalRemoveItem;

  beforeEach(() => {
    originalSetItem = Storage.prototype.setItem;
    originalGetItem = Storage.prototype.getItem;
    originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.setItem = () => { throw new Error('localStorage blocked'); };
    Storage.prototype.getItem = () => { throw new Error('localStorage blocked'); };
    Storage.prototype.removeItem = () => { throw new Error('localStorage blocked'); };
  });

  afterEach(() => {
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.removeItem = originalRemoveItem;
    forgetTutorial();
  });

  it('does not crash when localStorage throws', () => {
    expect(() => hasSeenTutorial()).not.toThrow();
    expect(() => markTutorialSeen()).not.toThrow();
    expect(() => forgetTutorial()).not.toThrow();
  });

  it('falls back to in-memory behavior when localStorage throws', () => {
    expect(hasSeenTutorial()).toBe(false);
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);
  });
});
