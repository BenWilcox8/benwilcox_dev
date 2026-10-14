import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';

const SearchCourses = () => {
  const { handleSearch } = useContext(AppContext);
  const [searchTerm, setSearchTerm] = useState('');

  const onSearchChange = (e) => {
    setSearchTerm(e.target.value);
    handleSearch(e.target.value);
  }

  const clearSearch = () => {
    setSearchTerm('');
    handleSearch('');
  }

  return (
    <div className="search-courses-container">
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder="Search courses..."
          aria-label="Search courses"
          value={searchTerm}
          onChange={onSearchChange}
          style={{ paddingRight: searchTerm ? '30px' : '8px' }}
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#666',
              padding: '0',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Clear search"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchCourses;
