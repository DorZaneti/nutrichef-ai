import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { streamChat } from '../api/stream';
import './ChatInterface.css';

function renderContent(text) {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

function ChatInterface({ ingredients, conversationHistory, setConversationHistory, onExtractedIngredients, online }) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamingReply, setStreamingReply] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, isLoading, streamingReply]);

  const sendMessageFallback = async (userMessage, overrideText) => {
    try {
      const response = await api.post('/api/chat', {
        message: userMessage,
        conversation_history: conversationHistory,
        current_ingredients: ingredients,
      });

      setConversationHistory(response.data.conversation_history);
      onExtractedIngredients(response.data.extracted_ingredients || []);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please check if the backend is running.');
      if (!overrideText) setMessage(userMessage);
    }
  };

  const sendMessage = async (e, overrideText) => {
    if (e) e.preventDefault();
    const userMessage = overrideText || message;
    if (!userMessage.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    if (!overrideText) setMessage('');
    setStreamingReply('');

    let gotDelta = false;

    await streamChat({
      message: userMessage,
      conversationHistory,
      currentIngredients: ingredients,
      onDelta: (text) => {
        gotDelta = true;
        setStreamingReply((prev) => (prev ?? '') + text);
      },
      onIngredients: (extracted) => onExtractedIngredients(extracted),
      onDone: (fullResponse) => {
        setConversationHistory((prev) => [
          ...prev,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: fullResponse },
        ]);
        setStreamingReply(null);
        setIsLoading(false);
      },
      onError: async (err) => {
        console.error('Chat stream failed:', err);
        setStreamingReply(null);
        if (gotDelta) {
          setError('Connection interrupted. Please try again.');
          setIsLoading(false);
        } else {
          await sendMessageFallback(userMessage, overrideText);
          setIsLoading(false);
        }
      },
    });
  };

  const quickActions = [
    'I have chicken breast 300g and rice 200g',
    'What can I make with these ingredients?',
    'Give me a healthy recipe',
    'I want something quick and easy',
  ];

  return (
    <div className="chat-interface">
      <div className="chat-header">
        <h2>💬 Chat with NutriChef AI</h2>
        <p>Tell me what ingredients you have and I'll suggest recipes!</p>
      </div>

      <div className="chat-messages">
        {conversationHistory.length === 0 ? (
          <div className="welcome-message">
            <h3>👋 Welcome to NutriChef AI!</h3>
            <p>I'm here to help you create delicious recipes based on your ingredients.</p>
            <p><strong>How to use:</strong></p>
            <ul>
              <li>Tell me what ingredients you have and their weights (in grams)</li>
              <li>I'll track them and find recipes automatically</li>
              <li>Get detailed nutritional information for your meals</li>
            </ul>
            <p className="example">Example: "I have chicken breast 300g, rice 200g, and broccoli 150g"</p>

            <div className="quick-actions">
              <p><strong>Quick actions:</strong></p>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-action-btn"
                  onClick={() => sendMessage(null, action)}
                  disabled={isLoading || !online}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        ) : (
          conversationHistory.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-header">
                <span className="message-role">
                  {msg.role === 'user' ? '👤 You' : '🤖 NutriChef AI'}
                </span>
              </div>
              <div className="message-content">
                {renderContent(msg.content)}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="message assistant">
            <div className="message-header">
              <span className="message-role">🤖 NutriChef AI</span>
            </div>
            {streamingReply ? (
              <div className="message-content">{renderContent(streamingReply)}</div>
            ) : (
              <div className="message-content loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {error && <div className="chat-error">{error}</div>}

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={online ? "Type your message… (e.g., 'I have chicken 300g and rice 200g')" : 'Chat needs a connection — you are offline'}
          disabled={isLoading || !online}
          className="chat-input"
        />
        <button type="submit" disabled={isLoading || !online || !message.trim()} className="send-button">
          {isLoading ? '…' : 'Send'}
        </button>
      </form>
    </div>
  );
}

export default ChatInterface;
