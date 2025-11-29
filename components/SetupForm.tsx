import React, { useState } from 'react';
import { StorySetup } from '../types';
import { Button } from './Button';

interface SetupFormProps {
  onStart: (setup: StorySetup) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const SetupForm: React.FC<SetupFormProps> = ({ onStart, onCancel, isLoading }) => {
  const [setup, setSetup] = useState<StorySetup>({
    setting: '',
    vibe: '',
    protagonist: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (setup.setting && setup.vibe && setup.protagonist) {
      onStart(setup);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-6 animate-fade-in relative">
      
      <button 
        onClick={onCancel}
        className="absolute top-0 left-6 flex items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </button>

      <div className="text-center mb-10 mt-8">
        <h1 className="text-4xl md:text-5xl font-serif text-gray-900 dark:text-white mb-4 tracking-tight transition-colors">
          CoAuthor
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg transition-colors">
          Shape your narrative. We'll write the words together.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white/80 dark:bg-gray-900/50 p-8 rounded-2xl border border-gray-200 dark:border-gray-800 backdrop-blur-sm shadow-2xl transition-colors">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 transition-colors">
            The Setting
          </label>
          <input
            type="text"
            required
            placeholder="e.g., A cyberpunk Neo-Tokyo rain-slicked alleyway..."
            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors"
            value={setup.setting}
            onChange={(e) => setSetup({ ...setup, setting: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 transition-colors">
            The Vibe/Tone
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Noir, suspenseful, melancholy, witty..."
            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors"
            value={setup.vibe}
            onChange={(e) => setSetup({ ...setup, vibe: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 transition-colors">
            Protagonist Persona
          </label>
          <textarea
            required
            rows={3}
            placeholder="e.g., A weary detective who has seen too much, cynical but secretly hopeful..."
            className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-300 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-colors resize-none"
            value={setup.protagonist}
            onChange={(e) => setSetup({ ...setup, protagonist: e.target.value })}
          />
        </div>

        <div className="pt-4">
          <Button 
            type="submit" 
            className="w-full py-4 text-lg" 
            isLoading={isLoading}
            variant="primary"
          >
            Begin Story
          </Button>
        </div>
      </form>
    </div>
  );
};