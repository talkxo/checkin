'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Calendar, Tag } from 'lucide-react';

interface SavedResponse {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function SavedResponsesPage() {
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    fetchResponses();
  }, [selectedTags, sortBy, sortOrder]);

  const fetchResponses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId: 'admin',
        sortBy,
        sortOrder
      });
      
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }
      
      const response = await fetch(`/api/admin/saved-responses?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setResponses(data);
        // Extract all unique tags
        const tags = new Set<string>();
        data.forEach((resp: SavedResponse) => {
          resp.tags.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
      }
    } catch (error) {
      console.error('Error fetching responses:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteResponse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this saved response?')) return;
    
    try {
      const response = await fetch(`/api/admin/saved-responses?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        fetchResponses();
      }
    } catch (error) {
      console.error('Error deleting response:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSortBy('created_at');
    setSortOrder('desc');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Saved Responses</h1>
            <p className="text-muted-foreground mt-1">Browse and manage your saved AI chat responses</p>
          </div>
          <Button onClick={() => window.location.href = '/admin?tab=ai'} variant="outline" className="rounded-xl">
            Back to AI
          </Button>
        </div>

        {/* Filters */}
        <div className="rounded-3xl border border-border/50 bg-card px-5 py-5">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">Filter by Tags</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer rounded-full"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {allTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tags yet</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-32 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">New to Old</SelectItem>
                  <SelectItem value="asc">Old to New</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={clearFilters} variant="outline" size="sm" className="rounded-xl">
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading saved responses...</p>
          </div>
        ) : responses.length === 0 ? (
          <div className="rounded-3xl border border-border/50 bg-card px-5 py-12 text-center">
            <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No saved responses</h3>
            <p className="text-muted-foreground">
              {selectedTags.length > 0
                ? `No responses found with the selected tags: ${selectedTags.join(', ')}`
                : 'You haven\'t saved any chat responses yet. Use the save icon in the chat to save important responses.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {responses.map((response) => (
              <div key={response.id} className="rounded-3xl border border-border/50 bg-card px-5 py-5 transition-colors hover:bg-muted/10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground">{response.title}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(response.created_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Tag className="h-4 w-4" />
                        {response.tags.length} tags
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteResponse(response.id)}
                    className="rounded-xl text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{response.content}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {response.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
