import React, { createContext, useContext } from 'react';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  defaultValue: string;
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value, onChange, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTabState] = React.useState(value || defaultValue);
  
  const activeValue = value !== undefined ? value : activeTab;
  
  const setActiveTab = (tab: string) => {
    if (value === undefined) {
      setActiveTabState(tab);
    }
    onChange?.(tab);
  };
  
  return (
    <TabsContext.Provider value={{ activeTab: activeValue, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return (
    <div className={`flex space-x-1 border-b border-brand-200 ${className}`}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');
  
  const { activeTab, setActiveTab } = context;
  const isActive = activeTab === value;
  
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`
        px-4 py-2 text-sm font-medium transition-colors duration-200
        border-b-2 -mb-px
        ${isActive
          ? 'border-accent-500 text-accent-600'
          : 'border-transparent text-brand-600 hover:text-brand-900 hover:border-brand-300'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');
  
  const { activeTab } = context;
  
  if (activeTab !== value) return null;
  
  return <div className={className}>{children}</div>;
}

