import React from 'react';

// The box and its label sit on one line. The label text can still wrap inside
// itself when the column is narrow, but it never wraps under the box.
//
// The classes used to be Tailwind utilities. The project has no Tailwind
// configuration and no `@tailwind` directive, so none of them ever applied.
const Checkbox = ({ label, checked, onChange, id }) => {
  return (
    <div className="checkbox-row">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        className="checkbox-input"
      />
      <label htmlFor={id} className="checkbox-label">
        {label}
      </label>
    </div>
  );
};

export default Checkbox;
