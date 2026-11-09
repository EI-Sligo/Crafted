import React from 'react';
import { Newspaper, ShoppingBag, Briefcase, BookOpen, MessageSquare, User } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type TabType = 'feed' | 'marketplace' | 'jobs' | 'courses' | 'messages' | 'profile';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  unreadCount: number;
  hasSafePass: boolean;
}

export const TabBar: React.FC<TabBarProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
  hasSafePass,
}) => {
  const { isDark } = useTheme();

  const tabs = [
    { id: 'feed' as TabType, label: 'Feed', icon: Newspaper },
    { id: 'marketplace' as TabType, label: 'Classifieds', icon: ShoppingBag },
    { id: 'jobs' as TabType, label: 'Jobs', icon: Briefcase },
    { id: 'courses' as TabType, label: 'Courses', icon: BookOpen },
    { id: 'messages' as TabType, label: 'Messages', icon: MessageSquare, badge: unreadCount },
    { id: 'profile' as TabType, label: 'Profile', icon: User, dot: hasSafePass },
  ];

  return (
    <nav
      className={`shrink-0 select-none pb-safe transition-colors border-t ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-lg'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-6 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center space-y-1 transition-colors cursor-pointer ${
                isActive
                  ? isDark
                    ? 'text-amber-400 font-bold'
                    : 'text-amber-600 font-bold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                    {tab.badge}
                  </span>
                ) : null}
                {tab.dot ? (
                  <span
                    className={`absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ${
                      isDark ? 'ring-slate-900' : 'ring-white'
                    }`}
                    title="Safe Pass Verified"
                  />
                ) : null}
              </div>
              <span className="text-[11px] tracking-tight">{tab.label}</span>
              {isActive && (
                <div
                  className={`absolute bottom-0 w-8 h-0.5 rounded-full ${
                    isDark ? 'bg-amber-400' : 'bg-amber-600'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
