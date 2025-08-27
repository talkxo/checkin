"use client";
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface KnowledgeItem {
  id: string;
  category: string;
  content: string;
  lastUpdated: Date;
}

interface KnowledgeBaseManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KnowledgeBaseManager({ isOpen, onClose }: KnowledgeBaseManagerProps) {
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load knowledge base from handbook.md
  useEffect(() => {
    const loadHandbookData = async () => {
      try {
        const response = await fetch('/api/admin/knowledge-base');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setKnowledgeItems(data.data.map((item: any) => ({
              id: item.id,
              category: item.category,
              content: item.content,
              lastUpdated: new Date(item.lastUpdated)
            })));
          }
        }
      } catch (error) {
        console.error('Error loading knowledge base:', error);
        // Fallback to sample data if API fails
        setKnowledgeItems([
          {
            id: '1',
            category: 'Getting Started',
            content: 'This handbook explains how things work here: our policies, our perks, and the culture that shapes our work.',
            lastUpdated: new Date('2024-01-15')
          },
          {
            id: '2',
            category: 'Benefits & Perks',
            content: 'Information about paid time off, sick leave, health insurance, and work culture perks.',
            lastUpdated: new Date('2024-01-20')
          },
          {
            id: '3',
            category: 'How We Work',
            content: 'Details about our work rhythm, principles, and management style.',
            lastUpdated: new Date('2024-01-10')
          }
        ]);
      }
    };

    loadHandbookData();
  }, []);

  const filteredItems = knowledgeItems.filter(item =>
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    setIsLoading(true);
    try {
      // In production, this would be an API call
      const updatedItems = knowledgeItems.map(item =>
        item.id === selectedItem.id
          ? { ...selectedItem, lastUpdated: new Date() }
          : item
      );
      setKnowledgeItems(updatedItems);
      setIsEditing(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error saving knowledge item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSelectedItem(null);
  };

  const handleAddNew = () => {
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      category: '',
      content: '',
      lastUpdated: new Date()
    };
    setSelectedItem(newItem);
    setIsEditing(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this knowledge item?')) return;

    setIsLoading(true);
    try {
      // In production, this would be an API call
      const updatedItems = knowledgeItems.filter(item => item.id !== itemId);
      setKnowledgeItems(updatedItems);
    } catch (error) {
      console.error('Error deleting knowledge item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Knowledge Base Manager
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage company policies and information for the assistant
              </p>
            </div>
            <Button
              onClick={handleAddNew}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <i className="fas fa-plus mr-2"></i>
              Add New
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex">
          {/* Left Panel - Knowledge Items List */}
          <div className="w-1/2 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <Input
                placeholder="Search knowledge base..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedItem?.id === item.id ? 'ring-2 ring-purple-500' : ''
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {item.category}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {item.content.substring(0, 150)}...
                        </p>
                        <div className="flex items-center mt-2">
                          <Badge variant="outline" className="text-xs">
                            Last updated: {formatDate(item.lastUpdated)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(item);
                          }}
                          className="text-xs"
                        >
                          <i className="fas fa-edit"></i>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Panel - Item Details/Edit */}
          <div className="w-1/2 flex flex-col">
            {selectedItem ? (
              <div className="flex-1 flex flex-col">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {isEditing ? 'Edit Knowledge Item' : selectedItem.category}
                    </h2>
                    {!isEditing && (
                      <Button
                        variant="outline"
                        onClick={() => handleEdit(selectedItem)}
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Edit
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 p-4 overflow-y-auto">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                        </label>
                        <Input
                          value={selectedItem.category}
                          onChange={(e) => setSelectedItem({
                            ...selectedItem,
                            category: e.target.value
                          })}
                          placeholder="Enter category name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content (Markdown supported)
                        </label>
                        <Textarea
                          value={selectedItem.content}
                          onChange={(e) => setSelectedItem({
                            ...selectedItem,
                            content: e.target.value
                          })}
                          placeholder="Enter content in Markdown format..."
                          className="min-h-[400px] font-mono text-sm"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleSave}
                          disabled={isLoading || !selectedItem.category.trim() || !selectedItem.content.trim()}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isLoading ? (
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                          ) : (
                            <i className="fas fa-save mr-2"></i>
                          )}
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isLoading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-gray-50 rounded-lg p-4 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {selectedItem.category}
                        </h3>
                        <div className="text-sm text-gray-600">
                          Last updated: {formatDate(selectedItem.lastUpdated)}
                        </div>
                      </div>
                      <div className="whitespace-pre-wrap text-sm text-gray-700">
                        {selectedItem.content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <i className="fas fa-file-alt text-4xl mb-4"></i>
                  <p>Select a knowledge item to view or edit</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
