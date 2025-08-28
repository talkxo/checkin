"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

interface AssistantChatProps {
  isVisible: boolean;
  userSlug?: string;
}

export default function AssistantChat({ isVisible, userSlug }: AssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your INSYDE assistant. I can help you with questions about company policies, work culture, benefits, and more. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onstart = () => {
        setIsListening(true);
      };
      
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat becomes visible
  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isVisible]);

  const startListening = () => {
    if (recognition) {
      recognition.start();
    } else {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Prepare conversation history for context
      const conversationHistory = messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          conversationHistory,
          userSlug
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        sources: data.sources
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content: 'Hi! I\'m your INSYDE assistant. I can help you with questions about company policies, work culture, benefits, and more. How can I help you today?',
        timestamp: new Date()
      }
    ]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
            <i className="fas fa-robot text-white text-sm"></i>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">INSYDE Assistant</h3>
            <p className="text-xs text-gray-600">Ask me about company policies and more</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearChat}
          className="text-gray-600 hover:text-gray-800"
        >
          <i className="fas fa-trash mr-1 text-xs"></i>
          Clear
        </Button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="fas fa-robot text-white text-xs"></i>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none">
                        {message.content.split('\n').map((line, index) => {
                          // Handle bold text
                          if (line.includes('**')) {
                            const parts = line.split('**');
                            return (
                              <div key={index} className="mb-1">
                                {parts.map((part, partIndex) => 
                                  partIndex % 2 === 1 ? (
                                    <strong key={partIndex} className="font-semibold">{part}</strong>
                                  ) : (
                                    <span key={partIndex}>{part}</span>
                                  )
                                )}
                              </div>
                            );
                          }
                          // Handle bullet points
                          if (line.trim().startsWith('•')) {
                            return (
                              <div key={index} className="flex items-start mb-1">
                                <span className="text-gray-500 mr-2 mt-1">•</span>
                                <span>{line.substring(1).trim()}</span>
                              </div>
                            );
                          }
                          // Handle empty lines
                          if (line.trim() === '') {
                            return <div key={index} className="mb-2"></div>;
                          }
                          // Regular text
                          return <div key={index} className="mb-1">{line}</div>;
                        })}
                      </div>
                    ) : (
                      <span>{message.content}</span>
                    )}
                  </div>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 font-medium">Sources:</span>
                        <div className="flex flex-wrap gap-1">
                          {message.sources.map((source, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-purple-200' : 'text-gray-500'
                  }`}>
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <div className="flex space-x-2 mb-3">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about company policies, work culture, benefits..."
              className="pr-12"
              disabled={isLoading}
            />
            <button
              onClick={isListening ? stopListening : startListening}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
              }`}
              disabled={isLoading}
            >
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'} text-sm`}></i>
            </button>
          </div>
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-purple-600 hover:bg-purple-700 px-4"
          >
            <i className="fas fa-paper-plane mr-1"></i>
            Send
          </Button>
        </div>
        
        {/* Speech Status */}
        {isListening && (
          <div className="text-center mb-3">
            <Badge variant="destructive" className="animate-pulse text-xs">
              <i className="fas fa-microphone mr-1"></i>
              Listening... Speak now
            </Badge>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue('How do we work and what are our principles?')}
            className="text-xs"
          >
            Work Culture
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInputValue('What is my leave balance?')}
            className="text-xs"
          >
            Leave Balance
          </Button>
        </div>
      </div>
    </div>
  );
}
