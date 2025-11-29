import React, { useState, useRef, useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { MessageBubble } from './components/MessageBubble';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { StorySetup, Message, Story, Memory, User } from './types';
import { generateNextSegment } from './services/gemini';
import { storageService } from './services/storage';

function App() {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Data State
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  
  // UI State
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [headerTitleInput, setHeaderTitleInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentStory = stories.find(s => s.id === currentStoryId);

  // Check for session on mount
  useEffect(() => {
    const session = storageService.getUserSession();
    if (session) {
      setUser(session);
      loadUserData(session.id);
    }
  }, []);

  // Theme Effect
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load Stories when user is set
  const loadUserData = async (userId: string) => {
    setAuthLoading(true);
    try {
      const userStories = await storageService.getStories(userId);
      setStories(userStories);
    } catch (e) {
      console.error("Failed to load stories", e);
    } finally {
      setAuthLoading(false);
    }
  };

  // Login Handler
  const handleLogin = async (email: string) => {
    setAuthLoading(true);
    try {
      const loggedInUser = await storageService.login(email);
      setUser(loggedInUser);
      storageService.saveUserSession(loggedInUser);
      await loadUserData(loggedInUser.id);
    } catch (e) {
      console.error("Login failed", e);
    } finally {
      setAuthLoading(false);
    }
  };

  // Logout Handler
  const handleLogout = () => {
    storageService.clearUserSession();
    setUser(null);
    setStories([]);
    setCurrentStoryId(null);
    setIsCreatingStory(false);
  };

  // Save stories to storage service whenever they change
  useEffect(() => {
    if (user && stories.length > 0) {
      storageService.saveStories(user.id, stories);
    }
  }, [stories, user]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentStory?.messages, isLoading]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const createNewStory = async (setup: StorySetup) => {
    setIsLoading(true);
    const newStoryId = crypto.randomUUID();
    
    // Optimistic UI for start
    const tempStory: Story = {
      id: newStoryId,
      title: setup.setting.split(' ').slice(0, 5).join(' ') + '...',
      setup,
      messages: [],
      memory: [],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    setStories(prev => [tempStory, ...prev]);
    setCurrentStoryId(newStoryId);
    setIsCreatingStory(false); // Exit creation mode

    try {
      const segment = await generateNextSegment(setup, [], []);
      
      const firstMessage: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: segment.content,
        choices: segment.choices,
      };

      setStories(prev => prev.map(s => 
        s.id === newStoryId 
        ? { ...s, messages: [firstMessage], lastUpdated: Date.now() } 
        : s
      ));
    } catch (err) {
      console.error(err);
      // Clean up if failed
      setStories(prev => prev.filter(s => s.id !== newStoryId));
      setCurrentStoryId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCurrentStory = (updates: Partial<Story>) => {
    if (!currentStoryId) return;
    setStories(prev => prev.map(s => 
      s.id === currentStoryId ? { ...s, ...updates, lastUpdated: Date.now() } : s
    ));
  };

  const saveHeaderTitle = () => {
    if (headerTitleInput.trim()) {
      updateCurrentStory({ title: headerTitleInput });
    }
    setIsEditingTitle(false);
  };

  const handleUserInteraction = async (text: string) => {
    if (!currentStory || isLoading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text,
    };

    // Update state optimistically
    const updatedMessages = [...currentStory.messages, userMsg];
    updateCurrentStory({ messages: updatedMessages });
    
    setIsLoading(true);
    setInputValue('');

    try {
      const historyForApi = updatedMessages.map(m => ({ role: m.role, text: m.text }));
      const segment = await generateNextSegment(currentStory.setup, historyForApi, currentStory.memory);
      
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: segment.content,
        choices: segment.choices,
      };

      updateCurrentStory({ messages: [...updatedMessages, aiMsg] });
    } catch (error) {
      console.error("Failed to generate", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Specialized Features ---

  const handleEditMessage = async (msgId: string, newText: string) => {
    if (!currentStory) return;
    const msgIndex = currentStory.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;
    const updatedMessages = [...currentStory.messages];
    updatedMessages[msgIndex] = { ...updatedMessages[msgIndex], text: newText };
    updateCurrentStory({ messages: updatedMessages });
  };

  const handleRegenerate = async (msgId: string) => {
    if (!currentStory || isLoading) return;
    const msgIndex = currentStory.messages.findIndex(m => m.id === msgId);
    if (msgIndex === -1) return;
    const historyBefore = currentStory.messages.slice(0, msgIndex);
    
    setIsLoading(true);
    updateCurrentStory({ messages: historyBefore });

    try {
      const historyForApi = historyBefore.map(m => ({ role: m.role, text: m.text }));
      const segment = await generateNextSegment(currentStory.setup, historyForApi, currentStory.memory);
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'model',
        text: segment.content,
        choices: segment.choices,
      };
      updateCurrentStory({ messages: [...historyBefore, aiMsg] });
    } catch (error) {
      console.error("Failed to regenerate", error);
      updateCurrentStory({ messages: currentStory.messages }); 
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMemory = () => {
    if (!currentStory) return;
    const newMemory: Memory = {
      id: crypto.randomUUID(),
      text: "New memory detail...",
      active: true
    };
    updateCurrentStory({ memory: [...currentStory.memory, newMemory] });
  };

  const updateMemory = (id: string, text: string) => {
    if (!currentStory) return;
    const updated = currentStory.memory.map(m => m.id === id ? { ...m, text } : m);
    updateCurrentStory({ memory: updated });
  };

  const removeMemory = (id: string) => {
    if (!currentStory) return;
    const updated = currentStory.memory.filter(m => m.id !== id);
    updateCurrentStory({ memory: updated });
  };

  const handleExport = (format: 'txt' | 'pdf' | 'epub' | 'mobi') => {
    if (!currentStory) return;

    const storyTitle = currentStory.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    if (format === 'txt' || format === 'epub' || format === 'mobi') {
      // Generate Text Content
      let content = `Title: ${currentStory.title}\n`;
      content += `Setting: ${currentStory.setup.setting}\n`;
      content += `Vibe: ${currentStory.setup.vibe}\n`;
      content += `Protagonist: ${currentStory.setup.protagonist}\n\n`;
      content += `--------------------------------\n\n`;
      
      currentStory.messages.forEach(msg => {
        const speaker = msg.role === 'model' ? 'CoAuthor' : 'You';
        content += `${speaker}:\n${msg.text}\n\n`;
      });

      if (format !== 'txt') {
          // Warning for binary formats in client-side only env
          alert(`Note: Native .${format} generation requires server-side processing. Downloading as text for backup.`);
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${storyTitle}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } 
    
    if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const htmlContent = `
          <html>
            <head>
              <title>${currentStory.title}</title>
              <style>
                body { font-family: 'Georgia', serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 40px; }
                h1 { font-size: 24px; text-align: center; margin-bottom: 40px; }
                .meta { font-style: italic; color: #666; margin-bottom: 40px; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 20px;}
                .message { margin-bottom: 24px; }
                .speaker { font-weight: bold; font-size: 12px; text-transform: uppercase; color: #888; margin-bottom: 4px; }
                .text { white-space: pre-wrap; }
              </style>
            </head>
            <body>
              <h1>${currentStory.title}</h1>
              <div class="meta">
                <p><strong>Setting:</strong> ${currentStory.setup.setting}</p>
                <p><strong>Vibe:</strong> ${currentStory.setup.vibe}</p>
                <p><strong>Protagonist:</strong> ${currentStory.setup.protagonist}</p>
              </div>
              ${currentStory.messages.map(msg => `
                <div class="message">
                  <div class="speaker">${msg.role === 'model' ? 'CoAuthor' : 'You'}</div>
                  <div class="text">${msg.text.replace(/\n/g, '<br>')}</div>
                </div>
              `).join('')}
              <script>
                window.onload = function() { window.print(); }
              </script>
            </body>
          </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      }
    }
  };

  // --- Render logic ---

  // 1. Show Auth Screen if not logged in
  if (!user) {
    return <AuthPage onLogin={handleLogin} isLoading={authLoading} />;
  }

  // 2. Show Dashboard or Setup if no story selected
  if (!currentStoryId || !currentStory) {
    if (isCreatingStory) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#101010] flex flex-col items-center justify-center p-4 transition-colors duration-300">
           <div className="absolute top-4 right-4 flex gap-4 items-center">
             <button
               onClick={toggleTheme}
               className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
             >
               {theme === 'dark' ? (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               )}
             </button>
           </div>
           <SetupForm 
              onStart={createNewStory} 
              onCancel={() => setIsCreatingStory(false)}
              isLoading={isLoading} 
            />
        </div>
      );
    }
    
    return (
      <Dashboard 
        user={user}
        stories={stories}
        onSelectStory={setCurrentStoryId}
        onCreateNew={() => setIsCreatingStory(true)}
        onLogout={handleLogout}
        onToggleTheme={toggleTheme}
        isDarkMode={theme === 'dark'}
      />
    );
  }

  // 3. Main App UI (Chat Interface)
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#101010] overflow-hidden transition-colors duration-300">
      
      {/* Left Sidebar: Story List */}
      <div className={`${showLeftSidebar ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-64 h-full bg-white dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-gray-800 transition-all duration-300 flex flex-col shadow-xl md:shadow-none`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setCurrentStoryId(null)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                title="Back to Dashboard"
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
             </button>
             <h2 className="font-serif text-gray-900 dark:text-white font-bold">My Stories</h2>
          </div>
          <button onClick={() => setShowLeftSidebar(false)} className="md:hidden text-gray-500 dark:text-gray-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {stories.map(story => (
            <button
              key={story.id}
              onClick={() => { setCurrentStoryId(story.id); setShowLeftSidebar(false); }}
              className={`w-full text-left p-4 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors border-l-2 ${story.id === currentStoryId ? 'border-blue-500 bg-gray-100 dark:bg-gray-900' : 'border-transparent text-gray-600 dark:text-gray-400'}`}
            >
              <div className={`text-sm font-medium truncate ${story.id === currentStoryId ? 'text-gray-900 dark:text-gray-200' : ''}`}>{story.title}</div>
              <div className="text-xs text-gray-500 dark:text-gray-600 mt-1">{new Date(story.lastUpdated).toLocaleDateString()}</div>
            </button>
          ))}
        </div>
        
        {/* User Footer in Sidebar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
           <div className="flex items-center gap-2 mb-3">
             <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
               {user.email[0].toUpperCase()}
             </div>
             <div className="overflow-hidden">
               <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{user.email}</div>
             </div>
           </div>
           <button 
             onClick={handleLogout}
             className="w-full py-1.5 px-3 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 mb-2 transition-colors"
           >
             Sign Out
           </button>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button 
            onClick={() => { setCurrentStoryId(null); setIsCreatingStory(true); }}
            className="w-full py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            + New Story
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative w-full h-full">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-[#101010]/95 backdrop-blur flex items-center justify-between px-4 z-20 transition-colors duration-300">
          <div className="flex items-center gap-3 flex-1">
            <button onClick={() => setShowLeftSidebar(true)} className="md:hidden text-gray-500 dark:text-gray-400">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-lg font-serif font-bold text-gray-800 dark:text-gray-100 hidden sm:block">CoAuthor</span>
            <span className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2 hidden sm:block"></span>
            
            {/* Title / Edit Area */}
            {isEditingTitle ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input 
                  autoFocus
                  value={headerTitleInput}
                  onChange={(e) => setHeaderTitleInput(e.target.value)}
                  className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white text-sm px-3 py-1.5 rounded-lg border border-blue-500/50 outline-none w-full sm:min-w-[200px]"
                  placeholder="Chapter Title"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveHeaderTitle();
                    if (e.key === 'Escape') setIsEditingTitle(false);
                  }}
                />
                <button onClick={saveHeaderTitle} className="text-green-600 dark:text-green-500 hover:text-green-500 dark:hover:text-green-400 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </button>
                <button onClick={() => setIsEditingTitle(false)} className="text-red-600 dark:text-red-500 hover:text-red-500 dark:hover:text-red-400 p-1">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group min-w-0">
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] sm:max-w-md group-hover:text-black dark:group-hover:text-white transition-colors cursor-pointer" onClick={() => {
                  setHeaderTitleInput(currentStory.title);
                  setIsEditingTitle(true);
                }}>
                  {currentStory.title}
                </span>
                <button 
                  onClick={() => {
                    setHeaderTitleInput(currentStory.title);
                    setIsEditingTitle(true);
                  }}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-600 hover:text-gray-900 dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
                  title="Edit Chapter Title"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Autosave Indicator */}
            <div className="hidden sm:flex items-center mr-3 text-xs text-gray-400 dark:text-gray-500 animate-fade-in pointer-events-none select-none transition-opacity">
              <svg className="w-3 h-3 mr-1.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved {new Date(currentStory.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            >
               {theme === 'dark' ? (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
               ) : (
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
               )}
            </button>
            <button 
              onClick={() => setShowRightSidebar(!showRightSidebar)}
              className={`p-2 rounded-lg transition-colors ${showRightSidebar ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
              title="Story Details & Memory"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth pb-32 custom-scrollbar">
          <div className="max-w-3xl mx-auto">
            {currentStory.messages.map((msg, index) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isLast={index === currentStory.messages.length - 1}
                onChoiceSelect={handleUserInteraction}
                onEdit={handleEditMessage}
                onRegenerate={handleRegenerate}
                isLoading={isLoading}
              />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-6 animate-slide-up">
                <div className="ml-2 bg-gray-200 dark:bg-gray-800/50 rounded-2xl rounded-tl-none px-5 py-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-500 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 via-gray-50 dark:from-[#101010] dark:via-[#101010] to-transparent pt-12 z-20 transition-colors duration-300">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); if(inputValue.trim()) handleUserInteraction(inputValue); }} className="relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isLoading ? "The story is unfolding..." : "Type an action or say something..."}
                disabled={isLoading}
                className="w-full bg-white dark:bg-gray-900/90 backdrop-blur border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-full py-4 pl-6 pr-14 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xl transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition-colors disabled:opacity-0 disabled:scale-90 transform"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Context & Memory */}
      <div className={`${showRightSidebar ? 'translate-x-0' : 'translate-x-full'} fixed right-0 top-0 h-full w-80 bg-white dark:bg-[#0a0a0a] border-l border-gray-200 dark:border-gray-800 transition-transform duration-300 z-40 overflow-y-auto shadow-2xl`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-[#0a0a0a] sticky top-0 z-10">
          <h2 className="font-serif text-gray-900 dark:text-white font-bold">Story Context</h2>
          <button onClick={() => setShowRightSidebar(false)} className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Setup Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Configuration</h3>
            
            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Chapter Title</label>
              <input 
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-200 focus:border-blue-500 outline-none"
                value={currentStory.title}
                onChange={(e) => updateCurrentStory({ title: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Setting</label>
              <textarea 
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-200 focus:border-blue-500 outline-none resize-none"
                rows={3}
                value={currentStory.setup.setting}
                onChange={(e) => updateCurrentStory({ setup: { ...currentStory.setup, setting: e.target.value } })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Vibe</label>
              <input 
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-200 focus:border-blue-500 outline-none"
                value={currentStory.setup.vibe}
                onChange={(e) => updateCurrentStory({ setup: { ...currentStory.setup, vibe: e.target.value } })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500 dark:text-gray-400">Protagonist</label>
              <textarea 
                className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-200 focus:border-blue-500 outline-none resize-none"
                rows={3}
                value={currentStory.setup.protagonist}
                onChange={(e) => updateCurrentStory({ setup: { ...currentStory.setup, protagonist: e.target.value } })}
              />
            </div>
          </div>

          {/* Memory Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Memory Bank</h3>
              <button onClick={handleAddMemory} className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300">
                + Add Fact
              </button>
            </div>
            
            <div className="space-y-3">
              {currentStory.memory.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-600 italic">No specific memories pinned yet.</p>
              )}
              {currentStory.memory.map(mem => (
                <div key={mem.id} className="relative group">
                  <textarea
                    className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-2 text-sm text-gray-900 dark:text-gray-200 focus:border-yellow-500/50 outline-none resize-none min-h-[60px]"
                    value={mem.text}
                    onChange={(e) => updateMemory(mem.id, e.target.value)}
                  />
                  <button 
                    onClick={() => removeMemory(mem.id)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-600">
              Details here are strictly injected into the AI's context window. Use this for names, inventory, or critical plot points.
            </p>
          </div>

          {/* Export Section */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider">Export Story</h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleExport('txt')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                TXT
              </button>
              <button 
                onClick={() => handleExport('pdf')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                PDF
              </button>
              <button 
                onClick={() => handleExport('epub')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                EPUB
              </button>
              <button 
                onClick={() => handleExport('mobi')}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                MOBI
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;