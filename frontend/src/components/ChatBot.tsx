import React, { useState, useRef, useEffect } from 'react';
import { askQuestion, ChatMessage } from '../services/chat';

interface ChatBotProps {
  userId: string;
}

export const ChatBot: React.FC<ChatBotProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askQuestion(inputValue.trim(), messages);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error.response?.data?.error || 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          role: 'assistant',
          content: "Hello! I'm your course assistant. Ask me anything about your enrolled courses!",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={handleToggle}
          style={styles.chatButton}
          title="Open Chat"
          aria-label="Open Chat"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
        >
          <span style={styles.chatIcon}>💬</span>
        </button>
      )}

      {isOpen && (
        <div style={styles.chatContainer}>
          <div style={styles.chatHeader}>
            <div style={styles.chatHeaderContent}>
              <span style={styles.chatHeaderIcon}>💬</span>
              <span style={styles.chatHeaderTitle}>Course Assistant</span>
            </div>
            <button
              onClick={handleToggle}
              style={styles.closeButton}
              title="Close Chat"
              aria-label="Close Chat"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>

          <div style={styles.messagesContainer}>
            {messages.map((message, index) => (
              <div
                key={index}
                style={{
                  ...styles.message,
                  ...(message.role === 'user' ? styles.userMessage : styles.assistantMessage),
                }}
              >
                <div style={styles.messageContent}>
                  {message.role === 'user' ? (
                    <div style={styles.userMessageBubble}>
                      {message.content}
                    </div>
                  ) : (
                    <div style={styles.assistantMessageBubble}>
                      <div style={styles.messageText}>{message.content}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={styles.loadingMessage}>
                <div style={styles.loadingDots}>
                  <span style={styles.loadingDot}></span>
                  <span style={styles.loadingDot}></span>
                  <span style={styles.loadingDot}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={styles.inputContainer}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your courses..."
              style={styles.input}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              style={{
                ...styles.sendButton,
                ...((!inputValue.trim() || isLoading) && styles.sendButtonDisabled),
              }}
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  chatButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    border: 'none',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  chatIcon: {
    fontSize: '28px',
  },
  chatContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '380px',
    height: '600px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
    overflow: 'hidden',
  },
  chatHeader: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  },
  chatHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  chatHeaderIcon: {
    fontSize: '20px',
  },
  chatHeaderTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#f8f9fa',
  },
  message: {
    display: 'flex',
    flexDirection: 'column',
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  assistantMessage: {
    alignItems: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
  },
  userMessageBubble: {
    backgroundColor: '#3498db',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '18px',
    borderBottomRightRadius: '4px',
    fontSize: '14px',
    lineHeight: '1.4',
    wordWrap: 'break-word',
  },
  assistantMessageBubble: {
    backgroundColor: 'white',
    color: '#333',
    padding: '10px 14px',
    borderRadius: '18px',
    borderBottomLeftRadius: '4px',
    fontSize: '14px',
    lineHeight: '1.4',
    wordWrap: 'break-word',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  messageText: {
    whiteSpace: 'pre-wrap',
  },
  loadingMessage: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '10px 14px',
  },
  loadingDots: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  loadingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#999',
    animation: 'bounce 1.4s infinite ease-in-out both',
  },
  inputContainer: {
    display: 'flex',
    padding: '12px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: 'white',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: '20px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  sendButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#3498db',
    border: 'none',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s, transform 0.1s',
  },
  sendButtonDisabled: {
    backgroundColor: '#bdc3c7',
    cursor: 'not-allowed',
    transform: 'none',
  },
};

