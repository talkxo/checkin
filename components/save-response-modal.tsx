'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, X } from 'lucide-react';

interface SaveResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  onSave: (title: string, tags: string[]) => void;
}

export default function SaveResponseModal({ isOpen, onClose, content, onSave }: SaveResponseModalProps) {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [recommendedTags, setRecommendedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);

  useEffect(() => {
    if (isOpen && content) {
      // Auto-generate title from first line
      const firstLine = content.split('\n')[0];
      setTitle(firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine);
      
      // Get AI tag recommendations
      getTagRecommendations();
    }
  }, [isOpen, content]);

  const getTagRecommendations = async () => {
    try {
      setRecommending(true);
      const response = await fetch('/api/admin/recommend-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title })
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecommendedTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error getting tag recommendations:', error);
    } finally {
      setRecommending(false);
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddNewTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      addTag(newTag.trim());
      setNewTag('');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    setLoading(true);
    try {
      await onSave(title.trim(), tags);
      handleClose();
    } catch (error) {
      console.error('Error saving response:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setTags([]);
    setNewTag('');
    setRecommendedTags([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Save Chat Response
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              className="mt-1"
            />
          </div>

          {/* Content Preview */}
          <div>
            <Label>Content Preview</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md max-h-32 overflow-y-auto text-sm">
              {content}
            </div>
          </div>

          {/* Recommended Tags */}
          <div>
            <Label className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Recommended Tags
              {recommending && <Loader2 className="h-4 w-4 animate-spin" />}
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {recommendedTags.map(tag => (
                <Badge
                  key={tag}
                  variant={tags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-purple-100"
                  onClick={() => addTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Custom Tags */}
          <div>
            <Label>Custom Tags</Label>
            <div className="mt-2 flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add custom tag..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
                className="flex-1"
              />
              <Button onClick={handleAddNewTag} variant="outline" size="sm">
                Add
              </Button>
            </div>
          </div>

          {/* Selected Tags */}
          {tags.length > 0 && (
            <div>
              <Label>Selected Tags</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="default" className="flex items-center gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer hover:bg-purple-700"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !title.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Response
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
