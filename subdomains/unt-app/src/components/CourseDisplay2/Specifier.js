import React, { useCallback, useEffect, useRef, useState } from 'react';
import Checkbox from '../shared/Checkbox';

// The Years box and the Semesters box of Course Display 2. They were two
// near-identical components; only the label type and the toggle differ.
//
//   title      heading of the box, and the click target that toggles all
//   idPrefix   prefix of the checkbox ids
//   items      every value the box can show
//   selected   the values that are on
//   onToggle   receives one value
//   onSelect   receives a list of values (drag selection, and toggle all)
//   parseLabel turns the text of a label back into a value
const Specifier = ({ title, idPrefix, items, selected, onToggle, onSelect, parseLabel }) => {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    // A text selection across the list selects the values it touches.
    const handleSelectionEnd = useCallback(() => {
        if (!isDragging) return;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && selection.toString().length > 0) {
            const range = selection.getRangeAt(0);
            const container = containerRef.current;
            const selectedItems = new Set();

            if (container) {
                for (const child of container.children) {
                    const label = child.querySelector('label');
                    if (label && range.intersectsNode(child)) {
                        selectedItems.add(parseLabel(label.textContent));
                    }
                }
            }

            if (selectedItems.size > 0) {
                onSelect(Array.from(selectedItems));
            }
        }
        if (selection) {
            selection.removeAllRanges();
        }
        setIsDragging(false);
    }, [isDragging, onSelect, parseLabel]);

    const handleToggleAll = () => {
        onSelect(selected.length > 0 ? [] : items);
    };

    useEffect(() => {
        window.addEventListener('mouseup', handleSelectionEnd);
        return () => window.removeEventListener('mouseup', handleSelectionEnd);
    }, [handleSelectionEnd]);

    return (
        <div className="specifier-box">
            <h4 onClick={handleToggleAll} style={{ cursor: 'pointer' }}>{title}</h4>
            <div className="specifier-list" ref={containerRef} onMouseDown={() => setIsDragging(true)}>
                {items.map(item => (
                    <Checkbox
                        key={item}
                        id={`${idPrefix}-${item}`}
                        label={item}
                        checked={selected.includes(item)}
                        onChange={() => onToggle(item)}
                    />
                ))}
            </div>
        </div>
    );
};

export default Specifier;
