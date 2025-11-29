import React from 'react';
import { Story, User } from '../types';
import { Button } from './Button';

interface DashboardProps {
  user: User;
  stories: Story[];
  onSelectStory: (id: string) => void;
  onCreateNew: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  isDarkMode: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  stories, 
  onSelectStory, 
  onCreateNew, 
  onLogout,
  onToggleTheme,
  isDarkMode
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#101010] p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        
        {/* Header */}
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gray-900 dark:bg-white text-white dark:text-black flex items-center justify-center font-bold text-lg">
               {user.email[0].toUpperCase()}
             </div>
             <div>
               <h1 className="text-xl font-serif font-bold text-gray-900 dark:text-white">Welcome back</h1>
               <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
             </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
            <button 
              onClick={onLogout}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Hero / Create New */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-serif font-bold mb-4">What story will you tell today?</h2>
            <p className="text-blue-100 text-lg mb-8">
              Create a new world, define a protagonist, and let CoAuthor guide your narrative journey.
            </p>
            <Button 
              onClick={onCreateNew} 
              className="bg-white text-blue-900 hover:bg-blue-50 dark:bg-white dark:text-blue-900 hover:scale-105 transform transition-transform shadow-lg border-none"
            >
              + Create New Story
            </Button>
          </div>
          {/* Decorative background elements */}
          <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 right-20 w-40 h-40 bg-indigo-500/30 rounded-full blur-xl"></div>
        </div>

        {/* Stories Grid */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-800 pb-2">
            Your Library <span className="text-sm font-normal text-gray-500 dark:text-gray-500 ml-2">({stories.length})</span>
          </h3>
          
          {stories.length === 0 ? (
            <div className="text-center py-20 bg-white/50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <p className="text-gray-500 dark:text-gray-400 text-lg">You haven't started any stories yet.</p>
              <button onClick={onCreateNew} className="text-blue-600 dark:text-blue-400 font-medium mt-2 hover:underline">
                Start your first one now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map(story => (
                <button
                  key={story.id}
                  onClick={() => onSelectStory(story.id)}
                  className="group flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4 w-full">
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-600 font-mono">
                      {new Date(story.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {story.title}
                  </h4>
                  
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-4">
                      {story.setup.setting}
                    </p>
                  </div>

                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800 w-full flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                      {story.messages.length} messages
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center">
                      Continue 
                      <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};