import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  createdAt: string;
}

interface ChatInterfaceProps {
  analysisId?: number;
  isAnalysisComplete: boolean;
}

export function ChatInterface({ analysisId, isAnalysisComplete }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/messages', analysisId],
    queryFn: async () => {
      if (!analysisId) return [];
      const res = await fetch(`/api/messages/${analysisId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    enabled: !!analysisId,
  });

  // Mutation to send a message
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!analysisId) throw new Error('No active analysis');
      return apiRequest('POST', '/api/messages', { content, analysisId });
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: async (response) => {
      // Invalidate the messages query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/messages', analysisId] });
      setMessage('');
      setIsTyping(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
      setIsTyping(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    if (!analysisId) {
      toast({
        title: 'No Active Analysis',
        description: 'Please upload files and process them first',
        variant: 'destructive',
      });
      return;
    }
    
    sendMessageMutation.mutate(message);
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h3 className="text-lg font-medium mb-4">AI Analysis & Chat</h3>

      <div className="chat-container">
        {/* Chat Messages */}
        <div className="chat-messages scrollbar-thin">
          {/* Initial System Message */}
          {!isLoading && messages.length === 0 && (
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="bg-neutral-100 rounded-lg p-3 max-w-3xl">
                <p className="text-sm">
                  Hello! I'm your AI curriculum assistant. I'll analyze your uploaded materials and provide insights to improve curriculum alignment with California K12 content standards. Please upload lesson slide decks, a summative assessment, and student response data to begin.
                </p>
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((msg: Message) => (
            <div key={msg.id} className={cn("flex items-start", msg.isUser && "justify-end")}>
              {!msg.isUser && (
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              
              <div className={cn(
                "rounded-lg p-3 max-w-[75%]",
                msg.isUser ? "bg-primary-light text-white" : "bg-neutral-100"
              )}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
              
              {msg.isUser && (
                <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-600 flex items-center justify-center ml-3 flex-shrink-0">
                  <span className="text-sm font-medium">ME</span>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mr-3 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="bg-neutral-100 rounded-lg p-3">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                  <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSubmit} className="chat-input">
          <Textarea 
            id="chat-input" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question about your curriculum..." 
            className="flex-1 border-none focus:ring-0 resize-none py-2 h-10"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!isAnalysisComplete || sendMessageMutation.isPending}
            className="ml-2 p-2 text-primary hover:text-primary-dark"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
          </Button>
        </form>
      </div>
    </div>
  );
}
