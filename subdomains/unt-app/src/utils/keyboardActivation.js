// Props that let a keyboard use an element which is not a real button but
// acts as one: it takes focus, it is announced as a button, and Enter or Space
// on it does what a mouse click on it does.
//
// The key sends a real click to the element. The click handlers stay the only
// place the action is defined, and the first-visit tutorial, which watches the
// clicks of the page, sees the same event from a keyboard as from a mouse.
//
// The key is consumed, so the tutorial does not also read Space as 'next step'.
export const activateOnKey = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    // A key pressed on a real control inside the element belongs to it.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.click();
};

export const buttonProps = {
    role: 'button',
    tabIndex: 0,
    onKeyDown: activateOnKey,
};
