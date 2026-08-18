import React from 'react';
import { act, render } from '@testing-library/react';
import ResizeHandle, { widthForPointer, widthOnRelease } from './ResizeHandle';

const SNAP = 30;

const drag = (overrides = {}) => ({
    startX: 500,
    startWidth: 175,
    startedCollapsed: false,
    maxWidth: 1000,
    ...overrides,
});

describe('widthForPointer', () => {
    it('follows the pointer one pixel for one pixel', () => {
        expect(widthForPointer(drag(), 600, SNAP)).toBe(275);
        expect(widthForPointer(drag(), 400, SNAP)).toBe(75);
    });

    it('collapses a drag that starts open and crosses the threshold', () => {
        expect(widthForPointer(drag(), 500 - 150, SNAP)).toBe(0);
    });

    // The c108 audit measured a 29px band where the handle stood still, and
    // then a 27px to 46px jump. A restore must track from the first pixel.
    it('leaves no dead band when the drag starts from the collapsed state', () => {
        const d = drag({ startWidth: 0, startedCollapsed: true });
        expect(widthForPointer(d, 501, SNAP)).toBe(1);
        expect(widthForPointer(d, 510, SNAP)).toBe(10);
        expect(widthForPointer(d, 529, SNAP)).toBe(29);
        expect(widthForPointer(d, 531, SNAP)).toBe(31);
    });

    it('never returns a negative width', () => {
        const d = drag({ startWidth: 0, startedCollapsed: true });
        expect(widthForPointer(d, 100, SNAP)).toBe(0);
    });

    // The audit dragged the Course Display 2 specifiers to 1140px inside a
    // 470px panel, which pushed the offerings out of the panel.
    it('clamps to the width of the panel', () => {
        const d = drag({ startWidth: 150, maxWidth: 400 });
        expect(widthForPointer(d, 500 + 900, SNAP)).toBe(400);
    });
});

describe('widthOnRelease', () => {
    it('closes a panel narrower than the threshold', () => {
        expect(widthOnRelease(12, SNAP)).toBe(0);
        expect(widthOnRelease(29, SNAP)).toBe(0);
    });

    it('keeps a panel at or over the threshold', () => {
        expect(widthOnRelease(30, SNAP)).toBe(30);
        expect(widthOnRelease(175, SNAP)).toBe(175);
    });

    it('leaves a closed panel closed', () => {
        expect(widthOnRelease(0, SNAP)).toBe(0);
    });
});

// The handle position must be continuous, or the handle leaves the pointer.
describe('handle position functions', () => {
    const infoHandleLeft = (width) => Math.max(width - 6, -2);
    const specHandleLeft = (width) => width + Math.min(width, 15);

    const largestStep = (fn) => {
        let largest = 0;
        for (let w = 0; w < 400; w += 1) {
            largest = Math.max(largest, Math.abs(fn(w + 1) - fn(w)));
        }
        return largest;
    };

    it('moves the Course Display 1 handle at most 1px per pixel of width', () => {
        expect(largestStep(infoHandleLeft)).toBeLessThanOrEqual(1);
    });

    it('moves the Course Display 2 handle at most 2px per pixel of width', () => {
        expect(largestStep(specHandleLeft)).toBeLessThanOrEqual(2);
    });

    // Every width the panel can rest at must sit exactly where it used to.
    it('keeps the resting positions of both handles unchanged', () => {
        expect(infoHandleLeft(0)).toBe(-2);
        expect(specHandleLeft(0)).toBe(0);
        for (const w of [30, 100, 150, 175, 400]) {
            expect(infoHandleLeft(w)).toBe(w - 6);
            expect(specHandleLeft(w)).toBe(w + 15);
        }
    });
});

// jsdom has no PointerEvent and no pointer capture.
const pointerEvent = (type, props) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...props });
    Object.defineProperty(event, 'pointerId', { value: props.pointerId ?? 1 });
    Object.defineProperty(event, 'pointerType', { value: props.pointerType ?? 'mouse' });
    return event;
};

beforeAll(() => {
    Element.prototype.setPointerCapture = function setPointerCapture() {};
    Element.prototype.releasePointerCapture = function releasePointerCapture() {};
    Element.prototype.hasPointerCapture = function hasPointerCapture() { return false; };
});

describe('ResizeHandle drag', () => {
    const setup = () => {
        const widths = [];
        let current = 175;
        const Wrapper = () => {
            const [width, setWidth] = React.useState(175);
            current = width;
            return (
                <ResizeHandle
                    className="handle"
                    width={width}
                    setWidth={(w) => { widths.push(w); setWidth(w); }}
                    position={(w) => w - 6}
                    getMaxWidth={() => 1000}
                />
            );
        };
        const { container } = render(<Wrapper />);
        return { handle: container.querySelector('.handle'), widths, width: () => current };
    };

    it('resizes while the button is held', () => {
        const { handle, widths } = setup();
        act(() => { handle.dispatchEvent(pointerEvent('pointerdown', { clientX: 500, button: 0, buttons: 1 })); });
        act(() => { handle.dispatchEvent(pointerEvent('pointermove', { clientX: 540, buttons: 1 })); });
        expect(widths[widths.length - 1]).toBe(215);
        act(() => { handle.dispatchEvent(pointerEvent('pointerup', { clientX: 540, buttons: 0 })); });
    });

    // The c108 audit released the button outside the window, and the bar then
    // followed the pointer with no button held.
    it('stops when a move arrives with no button held', () => {
        const { handle, widths } = setup();
        act(() => { handle.dispatchEvent(pointerEvent('pointerdown', { clientX: 500, button: 0, buttons: 1 })); });
        act(() => { handle.dispatchEvent(pointerEvent('pointermove', { clientX: 540, buttons: 1 })); });
        const afterDrag = widths[widths.length - 1];

        act(() => { handle.dispatchEvent(pointerEvent('pointermove', { clientX: 900, buttons: 0 })); });
        act(() => { handle.dispatchEvent(pointerEvent('pointermove', { clientX: 200, buttons: 0 })); });

        expect(widths[widths.length - 1]).toBe(afterDrag);
        expect(document.body.style.cursor).toBe('');
        expect(document.body.style.userSelect).toBe('');
    });

    it('does not start a drag on the secondary button', () => {
        const { handle, widths } = setup();
        act(() => { handle.dispatchEvent(pointerEvent('pointerdown', { clientX: 500, button: 2, buttons: 2 })); });
        act(() => { handle.dispatchEvent(pointerEvent('pointermove', { clientX: 600, buttons: 2 })); });
        expect(widths).toHaveLength(0);
    });

    it('restores the cursor and the text selection after a drag', () => {
        const { handle } = setup();
        act(() => { handle.dispatchEvent(pointerEvent('pointerdown', { clientX: 500, button: 0, buttons: 1 })); });
        expect(document.body.style.cursor).toBe('ew-resize');
        expect(document.body.style.userSelect).toBe('none');
        act(() => { handle.dispatchEvent(pointerEvent('pointerup', { clientX: 500, buttons: 0 })); });
        expect(document.body.style.cursor).toBe('');
        expect(document.body.style.userSelect).toBe('');
    });
});
