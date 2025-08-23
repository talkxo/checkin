'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Edit, Calendar, Tag } from 'lucide-react';

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
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Saved Responses</h1>
          <p className="text-gray-600 mt-2">Browse and manage your saved AI chat responses</p>
        </div>
        <Button onClick={() => window.history.back()} variant="outline">
          Back to Chat
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Filters & Sorting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Tag Filters */}
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Filter by Tags:</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">New to Old</SelectItem>
                  <SelectItem value="asc">Old to New</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={clearFilters} variant="outline" size="sm">
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading saved responses...</p>
        </div>
      ) : responses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No saved responses</h3>
            <p className="text-gray-600">
              {selectedTags.length > 0 
                ? `No responses found with the selected tags: ${selectedTags.join(', ')}`
                : 'You haven\'t saved any chat responses yet. Use the save icon in the chat to save important responses.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {responses.map((response) => (
            <Card key={response.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{response.title}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
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
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => deleteResponse(response.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{response.content}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {response.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
