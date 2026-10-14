// Props that let a keyboard use an element which is not a real button but
// acts as one: it takes focus, it is announced as a button, and Enter or Space
// on it does what a mouse click on it does.
//
// The key sends a real click to the element. The click handlers stay the only
// place the action is defined, and the first-visit tutorial, which watches the
// clicks of the page, sees the same event from a keyboard as from a mouse.
//
// The keys work as they do on a real button. Enter clicks on keydown. Space
// clicks on keyup, and only if nothing cancelled its keydown. While the
// tutorial runs, its window listener cancels the Space keydown and goes to the
// next step, so a mouse click that left focus here does not take Space from it.

// The Space keydown that the next Space keyup completes.
let spaceDown = null;

const onKeyDown = (event) => {
    // A key pressed on a real control inside the element belongs to it.
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter') {
        event.preventDefault();
        event.currentTarget.click();
    } else if (event.key === ' ') {
        spaceDown = event.nativeEvent;
    }
};

// Space scrolls the page in the keypress that follows a keydown nobody
// cancelled.
const onKeyPress = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === ' ') event.preventDefault();
};

const onKeyUp = (event) => {
    if (event.target !== event.currentTarget || event.key !== ' ') return;
    const down = spaceDown;
    spaceDown = null;
    if (!down || down.target !== event.currentTarget || down.defaultPrevented) return;
    event.currentTarget.click();
};

export const buttonProps = {
    role: 'button',
    tabIndex: 0,
    onKeyDown,
    onKeyPress,
    onKeyUp,
};
