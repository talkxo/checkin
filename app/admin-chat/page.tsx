"use client";
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BarChart3, Users, Calendar, TrendingUp, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AdminChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hotClues = [
    { icon: <BarChart3 className="w-4 h-4" />, label: "This Week's Stats", query: "Show me this week's attendance statistics" },
    { icon: <Users className="w-4 h-4" />, label: "Most Attentive", query: "Who was the most attentive employee this week?" },
    { icon: <MapPin className="w-4 h-4" />, label: "Office vs Remote", query: "Show me the breakdown of office vs remote work this week" },
    { icon: <Calendar className="w-4 h-4" />, label: "Weekly Summary", query: "Give me a summary of this week's attendance patterns" },
    { icon: <TrendingUp className="w-4 h-4" />, label: "Team Insights", query: "What are the key insights about team collaboration this week?" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleHotClue = (query: string) => {
    setInput(query);
  };

      return (
      <div className="h-screen bg-gray-50 flex flex-col">
                        {/* Header */}
                  <div className="bg-white border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img 
                          src="/insyde-logo.png" 
                          alt="INSYDE" 
                          className="h-6 w-auto"
                          style={{ maxWidth: '120px' }}
                        />
                        <h1 className="text-xl font-semibold text-gray-900">InsydeChat</h1>
                      </div>
                      <div className="text-sm text-gray-500">
                        Powered by AI
                      </div>
                    </div>
                  </div>

                        {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 && (
                      <div className="text-center text-gray-500 mt-20">
                        <Bot className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                        <h2 className="text-xl font-semibold mb-2 text-gray-900">Hello, I'm your InsydeChat Assistant</h2>
                        <p className="text-sm">Ask me anything about attendance data, employee insights, or use the quick actions below.</p>
                      </div>
                    )}

                            {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl p-4 shadow-sm ${
                            message.role === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            {message.role === 'assistant' && (
                              <Bot className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              {message.role === 'assistant' ? (
                                <div className="prose prose-sm max-w-none">
                                  <ReactMarkdown
                                    components={{
                                      h2: ({children}) => <h2 className="text-lg font-semibold text-gray-900 mb-2">{children}</h2>,
                                      h3: ({children}) => <h3 className="text-base font-semibold text-gray-900 mb-2">{children}</h3>,
                                      p: ({children}) => <p className="text-gray-700 mb-2">{children}</p>,
                                      strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                      em: ({children}) => <em className="italic text-gray-700">{children}</em>,
                                      ul: ({children}) => <ul className="list-disc list-inside space-y-1 mb-2">{children}</ul>,
                                      ol: ({children}) => <ol className="list-decimal list-inside space-y-1 mb-2">{children}</ol>,
                                      li: ({children}) => <li className="text-gray-700">{children}</li>,
                                      table: ({children}) => <div className="overflow-x-auto"><table className="min-w-full border border-gray-300 rounded-lg">{children}</table></div>,
                                      th: ({children}) => <th className="border border-gray-300 px-3 py-2 bg-gray-50 font-semibold text-gray-900">{children}</th>,
                                      td: ({children}) => <td className="border border-gray-300 px-3 py-2 text-gray-700">{children}</td>,
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <div className="whitespace-pre-wrap">{message.content}</div>
                              )}
                              <div className={`text-xs mt-3 ${message.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                            {message.role === 'user' && (
                              <User className="w-5 h-5 text-purple-200 mt-0.5 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                            {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center space-x-3">
                            <Bot className="w-5 h-5 text-purple-600" />
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

        <div ref={messagesEndRef} />
      </div>

                        {/* Hot Clues Menu */}
                  <div className="bg-white border-t border-gray-200 p-4">
                    <div className="flex space-x-3 overflow-x-auto pb-2">
                      {hotClues.map((clue, index) => (
                        <button
                          key={index}
                          onClick={() => handleHotClue(clue.query)}
                          className="flex items-center space-x-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors border border-gray-200"
                        >
                          {clue.icon}
                          <span>{clue.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                        {/* Input */}
                  <div className="bg-white border-t border-gray-200 p-6">
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                        placeholder="Ask about attendance data, employee insights..."
                        className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        disabled={isLoading}
                      />
                      <button
                        onClick={() => handleSend(input)}
                        disabled={isLoading || !input.trim()}
                        className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white p-3 rounded-lg transition-colors"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
    </div>
  );
}
