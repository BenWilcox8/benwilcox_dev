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

// Revision 10: the tooltip is headed with the thing itself, not the section.
// Revision 12: a step that wants a click says so. Revision 13: moving on
// without doing the step still applies it.
describe('what each step tells the reader', () => {
  const SECTION_WORDS = /course selector|course display|header$/i;

  it('heads every step with something of its own', () => {
    PARTS.forEach((part) => {
      part.steps.forEach((step) => {
        expect(typeof step.title).toBe('string');
        expect(step.title.length).toBeGreaterThan(0);
      });
    });
  });

  it('never heads a step with the name of its section', () => {
    PARTS.forEach((part) => {
      part.steps.forEach((step) => {
        expect(step.title).not.toMatch(SECTION_WORDS);
        expect(step.title).not.toBe(part.title);
      });
    });
  });

  it('names the toggle and the bar the captain called out', () => {
    const stepTitle = (partId, stepId) =>
      PARTS.find((p) => p.id === partId).steps.find((s) => s.id === stepId).title;
    expect(stepTitle('course-display-1', 'semester-bars')).toBe('Semester Bar');
    expect(stepTitle('course-display-1', 'course-count')).toBe('Course Count');
  });

  it('marks the steps that are asking for a click, and only those', () => {
    const wants = [];
    PARTS.forEach((part) => {
      part.steps.forEach((step) => {
        if (step.wantsClick) wants.push(part.id + '/' + step.id);
      });
    });
    expect(wants).toEqual([
      'course-selector/select-a-course',
      'course-display-1/course-count',
      'course-display-1/open-a-semester',
      'course-display-2/course-cells',
      'course-details/catalog-entry',
      'header/share',
      'header/info',
      'header/support',
      'header/tutorial-link',
    ]);
  });

  it('turns Course Count on when the reader moves past it either way', () => {
    const step = PARTS.find((p) => p.id === 'course-display-1')
      .steps.find((s) => s.id === 'course-count');
    const calls = [];
    const ctx = { setShowCourseCount: (v) => calls.push(v) };
    step.applyOnAdvance(ctx, { viaClick: false });
    step.applyOnAdvance(ctx, { viaClick: true });
    expect(calls).toEqual([true, true]);
  });

  it('opens a semester itself only when the reader did not open one', () => {
    const step = PARTS.find((p) => p.id === 'course-display-1')
      .steps.find((s) => s.id === 'open-a-semester');
    document.body.innerHTML = `
      <div class="semester-view-header-timeline"><div class="year-column-header">2022</div></div>
      <div class="course-display1-list"><div class="course-row">
        <div class="year-column listed"><div class="semester-cell">
          <div class="semester-bar fall filled"></div>
        </div></div>
      </div></div>`;
    let clicks = 0;
    document.querySelector('.semester-bar').addEventListener('click', () => { clicks += 1; });

    step.applyOnAdvance({}, { viaClick: true });
    expect(clicks).toBe(0);

    step.applyOnAdvance({}, { viaClick: false });
    expect(clicks).toBe(1);
  });
});
