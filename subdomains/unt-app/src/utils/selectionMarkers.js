// Selection markers of Course Display 1.
//
// A marker is drawn only at the edges of a run, so neighbouring selected
// years, and neighbouring selected semesters, read as one block.
//
//   items    every value in display order
//   isMarked (value) => boolean
//
// Returns one entry per item: { marked, start, end }.
export const runMarkers = (items, isMarked) => items.map((item, i) => {
    const marked = isMarked(item);
    if (!marked) return { marked: false, start: false, end: false };
    return {
        marked: true,
        start: i === 0 || !isMarked(items[i - 1]),
        end: i === items.length - 1 || !isMarked(items[i + 1]),
    };
});

// The class names a run marker adds, for the year columns and for the
// semester bands.
export const markerClassNames = (marker, prefix) => {
    if (!marker || !marker.marked) return '';
    return ` ${prefix}-marked`
        + (marker.start ? ` ${prefix}-marked-start` : '')
        + (marker.end ? ` ${prefix}-marked-end` : '');
};
