"use client";

import { useState } from 'react';

interface MoodModalProps {
  onClose: () => void;
  onSubmit: (mood: string, comment: string) => void;
  isSubmitting: boolean;
}

export default function MoodModal({ onClose, onSubmit, isSubmitting }: MoodModalProps) {
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [moodComment, setMoodComment] = useState<string>('');

  const moods = [
    { emoji: '😊', value: 'great' },
    { emoji: '🙂', value: 'good' },
    { emoji: '😞', value: 'challenging' },
    { emoji: '😴', value: 'exhausted' },
    { emoji: '🚀', value: 'productive' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-sm w-full border border-border/50 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground mb-4 text-center">How was your day?</h3>
        
        <div className="grid grid-cols-5 gap-3 mb-4">
          {moods.map((mood) => (
            <button
              key={mood.value}
              onClick={() => setSelectedMood(mood.value)}
              className={`p-3 rounded-lg border-2 transition-all flex items-center justify-center ${
                selectedMood === mood.value
                  ? 'border-primary bg-primary/10 scale-110'
                  : 'border-border hover:border-primary/50 hover:scale-105'
              }`}
            >
              <div className="text-2xl">{mood.emoji}</div>
            </button>
          ))}
        </div>
        
        {selectedMood && (
          <div className="mb-4">
            <textarea
              placeholder="Any highlights or challenges today? (optional)"
              value={moodComment}
              onChange={(e) => setMoodComment(e.target.value)}
              className="w-full p-3 border border-input rounded-md text-sm resize-none bg-background text-foreground"
              rows={3}
            />
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-input rounded-md text-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(selectedMood, moodComment)}
            disabled={!selectedMood || isSubmitting}
            className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors duration-200"
          >
            {isSubmitting ? 'Checking out...' : 'Check Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
