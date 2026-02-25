import { useState, useRef, useEffect } from 'react';
import { Send, X, User, MessageSquare } from 'lucide-react';
import { useEvaluationStore } from '@/store/evaluationStore';
import { clsx } from 'clsx';
import type { ChatMessage as ChatMessageType } from '@/types';

// Одно сообщение
function ChatMessage({ message }: { message: ChatMessageType }) {
  const isCurrentUser = message.author.id === 'expert_01';
  
  return (
    <div className={clsx(
      'flex gap-3 p-3 hover:bg-bg-tertiary/50 transition-colors',
      isCurrentUser && 'flex-row-reverse'
    )}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-accent-purple/30 flex items-center justify-center">
          <User className="w-4 h-4 text-accent-purple" />
        </div>
      </div>
      
      {/* Content */}
      <div className={clsx('flex-1 max-w-[80%]', isCurrentUser && 'text-right')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-primary">
            {message.author.name}
          </span>
          <span className="text-xs text-text-muted">
            {formatTime(message.timestamp)}
          </span>
          {message.task_id && (
            <span className="text-xs px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue rounded">
              {message.task_id}
            </span>
          )}
        </div>
        
        <div className={clsx(
          'text-sm text-text-secondary rounded-lg p-2',
          isCurrentUser 
            ? 'bg-accent-blue/10 text-left' 
            : 'bg-bg-tertiary'
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
}

// Форматирование времени
function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function ChatPanel() {
  const { toggleChat, chatMessages, sendChatMessage, currentTaskId } = useEvaluationStore();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);
  
  // Фокус на input при открытии
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleSend = () => {
    if (inputValue.trim()) {
      sendChatMessage(inputValue.trim());
      setInputValue('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <aside className="w-chat flex-shrink-0 bg-bg-secondary border-l border-border-default flex flex-col">
      {/* Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-border-default">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent-blue" />
          <span className="font-medium text-text-primary">Чат экспертов</span>
          <span className="text-xs text-text-muted">
            ({chatMessages.length})
          </span>
        </div>
        
        <button
          onClick={toggleChat}
          className="p-1 hover:bg-bg-tertiary rounded transition-colors"
        >
          <X className="w-4 h-4 text-text-muted" />
        </button>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-4">
            <div>
              <MessageSquare className="w-8 h-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">
                Нет сообщений
              </p>
              <p className="text-xs text-text-muted mt-1">
                Обсуждайте оценки с другими экспертами
              </p>
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Input */}
      <div className="p-3 border-t border-border-default">
        {currentTaskId && (
          <div className="text-xs text-text-muted mb-2">
            Контекст: <span className="text-accent-blue">{currentTaskId}</span>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            className="flex-1 px-3 py-2 bg-bg-primary border border-border-default rounded-md text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
          
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={clsx(
              'p-2 rounded-md transition-colors',
              inputValue.trim()
                ? 'bg-accent-blue text-bg-primary hover:bg-accent-blue/90'
                : 'bg-bg-tertiary text-text-muted cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
