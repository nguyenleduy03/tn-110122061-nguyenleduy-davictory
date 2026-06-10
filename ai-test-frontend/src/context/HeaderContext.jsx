import { createContext, useContext, useState } from 'react';

const HeaderContext = createContext(null);

export function HeaderProvider({ children }) {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  return (
    <HeaderContext.Provider value={{ tabs, setTabs, activeTab, setActiveTab }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error('useHeader must be inside HeaderProvider');
  return ctx;
}
