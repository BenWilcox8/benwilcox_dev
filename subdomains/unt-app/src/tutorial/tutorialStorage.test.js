import { forgetTutorial, hasSeenTutorial, LS_KEY, markTutorialSeen } from './tutorialStorage';

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
    expect(localStorage.getItem(LS_KEY)).not.toBeNull();
  });

  it('forgetTutorial removes the localStorage flag', () => {
    markTutorialSeen();
    forgetTutorial();
    expect(hasSeenTutorial()).toBe(false);
    expect(localStorage.getItem(LS_KEY)).toBeNull();
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

describe('the first-visit record (mixed availability)', () => {
  afterEach(() => forgetTutorial());

  it('forgetTutorial reports a clean state even when removeItem throws', () => {
    markTutorialSeen();
    expect(hasSeenTutorial()).toBe(true);

    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => { throw new Error('localStorage blocked'); };
    try {
      expect(() => forgetTutorial()).not.toThrow();
      expect(hasSeenTutorial()).toBe(false);
    } finally {
      Storage.prototype.removeItem = originalRemoveItem;
    }
  });

  it('falls back to memory when setItem throws after the probe succeeded', () => {
    expect(hasSeenTutorial()).toBe(false);

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota exceeded'); };
    try {
      expect(() => markTutorialSeen()).not.toThrow();
      expect(hasSeenTutorial()).toBe(true);
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  });

  it('falls back to memory when getItem throws after the probe succeeded', () => {
    markTutorialSeen();

    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('localStorage blocked'); };
    try {
      expect(() => hasSeenTutorial()).not.toThrow();
      expect(hasSeenTutorial()).toBe(false);
    } finally {
      Storage.prototype.getItem = originalGetItem;
    }
  });
});
