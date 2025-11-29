import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  onChoiceSelect: (choice: string) => void;
  onEdit: (id: string, newText: string) => void;
  onRegenerate: (id: string) => void;
  isLoading: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isLast, 
  onChoiceSelect,
  onEdit,
  onRegenerate,
  isLoading 
}) => {
  const isModel = message.role === 'model';
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text);
  const [copied, setCopied] = useState(false);

  const handleSaveEdit = () => {
    onEdit(message.id, editText);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTranslate = () => {
    // Opens Google Translate in a new tab with the text pre-filled
    const url = `https://translate.google.com/?sl=auto&text=${encodeURIComponent(message.text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`group flex w-full mb-6 ${isModel ? 'justify-start' : 'justify-end'} animate-slide-up`}>
      <div className={`max-w-[90%] md:max-w-[80%] lg:max-w-[70%] flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
        
        {/* Author Label */}
        <div className="text-xs mb-1 text-gray-500 dark:text-gray-500 ml-1">
          {isModel ? 'CoAuthor' : 'You'}
        </div>

        {/* Message Content */}
        <div 
          className={`
            relative px-5 py-4 text-[15px] md:text-[16px] leading-relaxed w-full shadow-sm
            ${isModel 
              ? 'bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-200 rounded-2xl rounded-tl-none font-serif border border-gray-200 dark:border-transparent' 
              : 'bg-blue-600/90 text-white rounded-2xl rounded-tr-none font-sans'
            }
          `}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className={`w-full p-2 rounded border focus:outline-none resize-y min-h-[100px] ${
                  isModel 
                    ? 'bg-gray-100 dark:bg-black/20 text-gray-900 dark:text-inherit border-gray-300 dark:border-white/20 focus:border-blue-500 dark:focus:border-white/50' 
                    : 'bg-blue-700/50 text-white border-white/20 focus:border-white/50'
                }`}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button 
                  onClick={() => setIsEditing(false)} 
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    isModel 
                      ? 'text-gray-600 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-white/10' 
                      : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  className={`px-3 py-1 text-xs rounded transition-colors font-semibold ${
                    isModel 
                      ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-white/20 dark:hover:bg-white/30' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Save & Update
                </button>
              </div>
            </div>
          ) : (
            message.text ? (
              <ReactMarkdown 
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  em: ({node, ...props}) => <em className={`${isModel ? 'text-gray-700 dark:text-gray-300' : 'text-blue-100'} italic`} {...props} />,
                  strong: ({node, ...props}) => <strong className={`font-semibold ${isModel ? 'text-gray-900 dark:text-white' : 'text-white'}`} {...props} />
                }}
              >
                {message.text}
              </ReactMarkdown>
            ) : (
              <span className="italic opacity-50">...</span>
            )
          )}
        </div>

        {/* Action Bar (Edit, Copy, Regenerate, Translate) */}
        {!isEditing && !isLoading && (
          <div className={`flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
            <button 
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center gap-1 transition-colors"
              title="Edit message"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            
            <button 
              onClick={handleCopy}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center gap-1 transition-colors"
              title="Copy to clipboard"
            >
               {copied ? (
                 <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                 </svg>
               ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
               )}
            </button>

            <button 
              onClick={handleTranslate}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center gap-1 transition-colors"
              title="Translate via Google Translate"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </button>

            {isModel && (
              <button 
                onClick={() => onRegenerate(message.id)}
                className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                title={isLast ? "Regenerate response" : "Rewind story to here and regenerate"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Interactive Choices (Only for last model message and if choices exist) */}
        {isModel && message.choices && message.choices.length > 0 && isLast && !isEditing && (
          <div className="mt-4 space-y-2 animate-fade-in w-full pl-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2">Continue the story</p>
            <div className="flex flex-col gap-2">
              {message.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => onChoiceSelect(choice)}
                  disabled={isLoading}
                  className="text-left p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed group flex items-center shadow-sm"
                >
                  <span className="w-6 h-6 flex-shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 flex items-center justify-center text-xs mr-3 border border-gray-300 dark:border-gray-700 group-hover:border-gray-400 dark:group-hover:border-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300">
                    {idx + 1}
                  </span>
                  {choice}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};