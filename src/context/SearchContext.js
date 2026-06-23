import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export const SearchProvider = ({ children }) => {
  const [resetSearch, setResetSearch] = useState(false);

  const triggerReset = () => {
    setResetSearch(prev => !prev);
  };

  return (
    <SearchContext.Provider value={{ resetSearch, triggerReset }}>
      {children}
    </SearchContext.Provider>
  );
};
