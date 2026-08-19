import { DECORATION_CLASSES, DEFAULT_COURSE_POSITION, PARTS, SECTIONS } from './tutorialConfig';

// The engine reads only the fields documented at the top of tutorialConfig.js,
// so a part that is added later is correct exactly when it keeps to that shape.
// These checks are what makes "a new part is data only" a real claim.

const PART_ORDER = [
  'course-selector',
  'course-display-1',
  'course-display-2',
  'course-details',
  'header',
];

const STEP_COUNTS = {
  'course-selector': 1,
  'course-display-1': 8,
  'course-display-2': 2,
  'course-details': 2,
  header: 4,
};

describe('the tutorial as the captain specified it', () => {
  it('has the five parts, in order', () => {
    expect(PARTS.map((part) => part.id)).toEqual(PART_ORDER);
  });

  it('has the specified number of steps in each part', () => {
    PARTS.forEach((part) => {
      expect([part.id, part.steps.length]).toEqual([part.id, STEP_COUNTS[part.id]]);
    });
  });

  it('opens with the arrow on the fourth course', () => {
    expect(DEFAULT_COURSE_POSITION).toBe(4);
  });
});

describe('every part keeps to the shape the engine reads', () => {
  it('names a section that exists', () => {
    PARTS.forEach((part) => {
      expect(SECTIONS[part.section]).toBeDefined();
    });
  });

  it('gives every step an id, an instruction and a target', () => {
    PARTS.forEach((part) => {
      part.steps.forEach((step) => {
        expect(typeof step.id).toBe('string');
        expect(step.text).toBeDefined();
        expect(typeof step.target).toBe('function');
      });
    });
  });

  it('keeps every step id unique inside its part', () => {
    PARTS.forEach((part) => {
      const ids = part.steps.map((step) => step.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  it('only asks for decorations the overlay knows how to apply', () => {
    PARTS.forEach((part) => {
      part.steps.forEach((step) => {
        (step.decorations || []).forEach((name) => {
          expect(DECORATION_CLASSES[name]).toBeDefined();
        });
      });
    });
  });

  it('gives every gate a condition and a section it can resolve', () => {
    PARTS.filter((part) => part.gate).forEach((part) => {
      expect(typeof part.gate.when).toBe('function');
      expect(part.gate.text).toBeDefined();
      const section = part.gate.section;
      if (typeof section === 'string') expect(SECTIONS[section]).toBeDefined();
      else expect(typeof section).toBe('function');
    });
  });
});

describe('the gates name what is missing', () => {
  const emptyPage = { coursesInDisplay1: [], activeCourse: null };
  const noSelection = { coursesInDisplay1: [{ main_course_id: 1 }], activeCourse: null };

  function gateOf(id) {
    return PARTS.find((part) => part.id === id).gate;
  }

  function resolve(value, ctx) {
    return typeof value === 'function' ? value(ctx) : value;
  }

  it('blocks course display 1 until the timeline has a course', () => {
    expect(gateOf('course-display-1').when(emptyPage)).toBe(false);
    expect(gateOf('course-display-1').when(noSelection)).toBe(true);
  });

  it('sends the reader to the course selector when the timeline is empty', () => {
    const gate = gateOf('course-display-2');
    expect(resolve(gate.section, emptyPage)).toBe('courseSelector');
    expect(resolve(gate.text, emptyPage)).toMatch(/course selector/i);
  });

  it('sends the reader to the timeline when nothing is selected', () => {
    const gate = gateOf('course-details');
    expect(resolve(gate.section, noSelection)).toBe('display1');
    expect(resolve(gate.text, noSelection)).toMatch(/no course is selected/i);
    expect(gate.when(noSelection)).toBe(false);
  });
});

// Revision 7: a click that changes the app is the reader using the page, not
// the reader saying "next". Only the clicks a step names may advance it.
describe('which clicks advance a step', () => {
  function stepOf(partId, stepId) {
    return PARTS.find((part) => part.id === partId).steps.find((step) => step.id === stepId);
  }

  function advancesOn(step, ctx, html) {
    document.body.innerHTML = html;
    const element = document.querySelector('[data-click]');
    const rule = step.clickAdvances;
    // A step with no rule of its own falls back to the engine's default, which
    // is tested through isInertClick in tutorialDom.test.js.
    return rule ? rule(ctx, element) : null;
  }

  const bar = '<div class="semester-bar filled" data-click></div>';
  const emptyBar = '<div class="semester-bar" data-click></div>';
  const toggle = '<div class="checkbox-row"><input id="course-count" data-click /></div>';
  const link = '<a href="#x" data-click>Catalog Entry</a>';
  const words = '<div class="course-details-description" data-click>plain words</div>';

  it('never advances part 1 on a click: picking a course is watched instead', () => {
    const step = stepOf('course-selector', 'select-a-course');
    expect(advancesOn(step, {}, words)).toBe(false);
    expect(advancesOn(step, {}, bar)).toBe(false);
  });

  it('advances the Course Count step on the toggle only once it is on', () => {
    const step = stepOf('course-display-1', 'course-count');
    expect(advancesOn(step, { showCourseCount: false }, toggle)).toBe(false);
    expect(advancesOn(step, { showCourseCount: true }, toggle)).toBe(true);
  });

  it('does not advance the Course Count step on an unrelated real action', () => {
    const step = stepOf('course-display-1', 'course-count');
    expect(advancesOn(step, { showCourseCount: true }, bar)).toBe(false);
  });

  it('advances the closing step of the timeline on a filled bar, not an empty one', () => {
    const step = stepOf('course-display-1', 'open-a-semester');
    expect(advancesOn(step, {}, bar)).toBe(true);
    expect(advancesOn(step, {}, emptyBar)).toBe(false);
  });

  it('advances a link step on the link, and on nothing that acts', () => {
    const step = stepOf('course-details', 'catalog-entry');
    expect(advancesOn(step, {}, link)).toBe(true);
    expect(advancesOn(step, {}, words)).toBe(true);
    expect(advancesOn(step, {}, bar)).toBe(false);
  });

  it('leaves the years step to the keyboard', () => {
    const step = stepOf('course-display-2', 'pick-years-and-semesters');
    expect(advancesOn(step, {}, words)).toBe(false);
  });

  it('gives the plain reading steps no rule of their own', () => {
    expect(stepOf('course-display-1', 'semester-bars').clickAdvances).toBeUndefined();
    expect(stepOf('course-details', 'course-description').clickAdvances).toBeUndefined();
  });
});
