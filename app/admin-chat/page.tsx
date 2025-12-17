"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Send, Bot, User, BarChart3, Users, Calendar, TrendingUp, MapPin, Settings, Bookmark, LogOut, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import DarkModeToggle from '@/components/dark-mode-toggle';
import ReactMarkdown from 'react-markdown';
import SaveResponseModal from '@/components/save-response-modal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AdminChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseStyle, setResponseStyle] = useState<'short' | 'detailed' | 'report'>('short');
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [lastError, setLastError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hotClues = [
    { icon: <BarChart3 className="w-4 h-4" />, label: "Team Status", query: "What's the current team status? Who's in office vs remote today?" },
    { icon: <Users className="w-4 h-4" />, label: "Attendance Patterns", query: "Show me unusual attendance patterns or trends that need attention" },
    { icon: <MapPin className="w-4 h-4" />, label: "Space Utilization", query: "How is our office space being utilized? Any optimization opportunities?" },
    { icon: <Calendar className="w-4 h-4" />, label: "Team Coordination", query: "What are the best days for team meetings and collaboration?" },
    { icon: <TrendingUp className="w-4 h-4" />, label: "Cost Insights", query: "What are the cost implications of our current hybrid work patterns?" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-auth');
        if (!response.ok) {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/admin/login');
      }
    };

    checkAuth();
  }, [router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.style-dropdown')) {
        setShowStyleDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSend = async (message: string, isRetry: boolean = false) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    if (!isRetry) {
      setMessages(prev => [...prev, userMessage]);
      setInput('');
    }
    setIsLoading(true);
    setLastError('');
    setLoadingStep('Analyzing your request...');

    try {
      setLoadingStep('Fetching team data...');
      const response = await fetch('/api/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, responseStyle })
      });

      setLoadingStep('Processing with AI...');

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        setRetryCount(0); // Reset retry count on success
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastError(errorMsg);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMsg}. Please try again or use the dashboard for immediate insights.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
      if (lastUserMessage) {
        setRetryCount(prev => prev + 1);
        handleSend(lastUserMessage.content, true);
      }
    }
  };

  const handleHotClue = (query: string) => {
    setInput(query);
  };

  const handleSaveResponse = (content: string) => {
    setSelectedResponse(content);
    setSaveModalOpen(true);
  };

  const handleSave = async (title: string, tags: string[]) => {
    try {
      const response = await fetch('/api/admin/saved-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'admin',
          title,
          content: selectedResponse,
          tags
        })
      });

      if (response.ok) {
        // Show success message or toast
        console.log('Response saved successfully');
      } else {
        throw new Error('Failed to save response');
      }
    } catch (error) {
      console.error('Error saving response:', error);
      alert('Failed to save response. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST'
      });
      
      if (response.ok) {
        // Redirect to login page
        window.location.href = '/admin/login';
      } else {
        console.error('Logout failed');
        // Fallback: redirect anyway
        window.location.href = '/admin/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: redirect anyway
      window.location.href = '/admin/login';
    }
  };

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50 dark:border-border">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 flex items-center justify-center">
              <img 
                src="https://pqkph3lzaffmetri.public.blob.vercel-storage.com/1764957051530-Inside-Icon.png" 
                alt="insyde" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground dark:text-foreground">Admin Chat</h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">AI-powered attendance insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DarkModeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/admin'}
              className="text-muted-foreground dark:text-muted-foreground hover:text-foreground"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground dark:text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-6 mb-6">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-center py-20"
              >
                <Bot className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h2 className="text-xl font-semibold mb-2 text-foreground dark:text-foreground">Hello, I'm your Chat Assistant</h2>
                <p className="text-sm mb-4 text-muted-foreground dark:text-muted-foreground">I help People Ops teams manage hybrid work with intelligent insights.</p>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Ask me about team status, attendance patterns, space utilization, or use the quick actions below.</p>
              </motion.div>
            )}

            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-4 elevation-md ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card dark:bg-card text-card-foreground dark:text-card-foreground border border-border/50 dark:border-border'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {message.role === 'assistant' && (
                      <Bot className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h2: ({children}) => <h2 className="text-lg font-semibold text-foreground dark:text-foreground mb-3">{children}</h2>,
                              h3: ({children}) => <h3 className="text-base font-semibold text-foreground dark:text-foreground mb-2">{children}</h3>,
                              p: ({children}) => <p className="text-foreground dark:text-foreground mb-3 leading-relaxed">{children}</p>,
                              strong: ({children}) => <strong className="font-semibold text-foreground dark:text-foreground">{children}</strong>,
                              em: ({children}) => <em className="italic text-foreground dark:text-foreground">{children}</em>,
                              ul: ({children}) => <ul className="list-disc list-inside space-y-2 mb-4 text-foreground dark:text-foreground">{children}</ul>,
                              ol: ({children}) => <ol className="list-decimal list-inside space-y-2 mb-4 text-foreground dark:text-foreground">{children}</ol>,
                              li: ({children}) => <li className="text-foreground dark:text-foreground leading-relaxed">{children}</li>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                      <div className={`flex items-center justify-between mt-3 ${message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground dark:text-muted-foreground'}`}>
                        <div className="text-xs">
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => handleSaveResponse(message.content)}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                            title="Save this response"
                          >
                            <Bookmark className="w-3 h-3" />
                            Save
                          </button>
                        )}
                      </div>
                    </div>
                    {message.role === 'user' && (
                      <User className="w-5 h-5 text-primary-foreground/70 mt-0.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card dark:bg-card border border-border/50 dark:border-border rounded-xl p-4 elevation-md">
                  <div className="flex items-center space-x-3">
                    <Bot className="w-5 h-5 text-primary" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground dark:text-muted-foreground ml-2">{loadingStep}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error state with retry option */}
            {lastError && !isLoading && (
              <div className="flex justify-start">
                <div className="bg-destructive/10 border border-destructive/50 rounded-xl p-4 elevation-md max-w-[80%]">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm text-destructive font-medium mb-2">Request Failed</div>
                      <div className="text-sm text-destructive/90 mb-3">{lastError}</div>
                      <div className="flex space-x-2">
                        <Button
                          onClick={handleRetry}
                          size="sm"
                          variant="destructive"
                          disabled={retryCount >= 3}
                        >
                          Try Again {retryCount > 0 && `(${retryCount}/3)`}
                        </Button>
                        <Button
                          onClick={() => setLastError('')}
                          variant="outline"
                          size="sm"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Hot Clues Menu */}
        <div className="bg-card dark:bg-card border-t border-border/50 dark:border-border p-4 rounded-b-xl">
          <div className="max-w-4xl mx-auto flex space-x-3 overflow-x-auto pb-2">
            {hotClues.map((clue, index) => (
              <button
                key={index}
                onClick={() => handleHotClue(clue.query)}
                className="flex items-center space-x-2 bg-muted dark:bg-muted hover:bg-primary/10 text-foreground dark:text-foreground hover:text-primary px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors border border-border dark:border-border"
              >
                {clue.icon}
                <span>{clue.label}</span>
              </button>
            ))}
            <button
              onClick={() => window.location.href = '/admin/saved-responses'}
              className="flex items-center space-x-2 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors border border-primary/20"
            >
              <Bookmark className="w-4 h-4" />
              <span>Saved Responses</span>
            </button>
          </div>
        </div>

        {/* Input */}
        <div className="bg-card dark:bg-card border-t border-border/50 dark:border-border p-4 md:p-6 rounded-b-xl">
          <div className="max-w-4xl mx-auto flex space-x-2 md:space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
              placeholder="Ask about attendance data, employee insights..."
              className="flex-1 bg-background dark:bg-background border border-border dark:border-border text-foreground dark:text-foreground rounded-lg px-3 md:px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-[48px] text-sm md:text-base"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground rounded-lg transition-colors h-[48px] w-[44px] md:w-[48px] flex items-center justify-center flex-shrink-0 elevation-md button-press"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <div className="relative style-dropdown flex-shrink-0">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                disabled={isLoading}
                className="bg-background dark:bg-background border border-border dark:border-border text-foreground dark:text-foreground rounded-lg px-2 md:px-3 py-3 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-muted dark:hover:bg-muted transition-colors h-[48px] w-[44px] md:w-[48px] flex items-center justify-center"
                title="Response Style"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              
              {showStyleDropdown && (
                <div className="absolute bottom-full right-0 mb-2 bg-card dark:bg-card border border-border dark:border-border rounded-lg elevation-lg z-10 min-w-[120px] md:min-w-[140px]">
                  <div className="py-1">
                    <button
                      onClick={() => { setResponseStyle('short'); setShowStyleDropdown(false); }}
                      className={`w-full text-left px-3 md:px-4 py-2 text-sm hover:bg-muted dark:hover:bg-muted transition-colors ${
                        responseStyle === 'short' 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-foreground dark:text-foreground'
                      }`}
                    >
                      Short
                    </button>
                    <button
                      onClick={() => { setResponseStyle('detailed'); setShowStyleDropdown(false); }}
                      className={`w-full text-left px-3 md:px-4 py-2 text-sm hover:bg-muted dark:hover:bg-muted transition-colors ${
                        responseStyle === 'detailed' 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-foreground dark:text-foreground'
                      }`}
                    >
                      Detailed
                    </button>
                    <button
                      onClick={() => { setResponseStyle('report'); setShowStyleDropdown(false); }}
                      className={`w-full text-left px-3 md:px-4 py-2 text-sm hover:bg-muted dark:hover:bg-muted transition-colors ${
                        responseStyle === 'report' 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-foreground dark:text-foreground'
                      }`}
                    >
                      Report
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Response Modal */}
      <SaveResponseModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        content={selectedResponse}
        onSave={handleSave}
      />
    </div>
  );
}
