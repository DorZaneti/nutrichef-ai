import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { streamChat } from '../api/stream';
import { useI18n } from '../i18n';
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

const QUICK_ACTIONS = ['chat.quickHighProtein', 'chat.quickQuick', 'chat.quickRemaining'];

function ChatInterface({
  ingredients,
  conversationHistory,
  setConversationHistory,
  onAgentAction,
  online,
  profile,
  todayTotals,
}) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [streamingReply, setStreamingReply] = useState(null);
  const [toolStatus, setToolStatus] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [conversationHistory, isLoading, streamingReply, toolStatus]);

  const requestBody = (userMessage) => ({
    message: userMessage,
    conversationHistory,
    currentIngredients: ingredients,
    profile,
    todayTotals,
  });

  const sendMessageFallback = async (userMessage, overrideText) => {
    try {
      const body = requestBody(userMessage);
      const response = await api.post('/api/chat', {
        message: body.message,
        conversation_history: body.conversationHistory,
        current_ingredients: body.currentIngredients,
        profile: body.profile,
        today_totals: body.todayTotals,
      });
      setConversationHistory(response.data.conversation_history);
      (response.data.actions || []).forEach(onAgentAction);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.status === 429 ? t('common.dailyLimit') : t('chat.errorSend'));
      if (!overrideText) setMessage(userMessage);
    }
  };

  const sendMessage = async (e, overrideText) => {
    if (e) e.preventDefault();
    const userMessage = overrideText || message;
    if (!userMessage.trim() || isLoading) return;

    setIsLoading(true);
    setError('');
    setToolStatus(null);
    if (!overrideText) setMessage('');
    setStreamingReply('');

    let gotEvent = false;

    await streamChat({
      ...requestBody(userMessage),
      onDelta: (text) => {
        gotEvent = true;
        setToolStatus(null);
        setStreamingReply((prev) => (prev ?? '') + text);
      },
      onToolStatus: (tool) => {
        gotEvent = true;
        setToolStatus(tool);
      },
      onAction: (action) => {
        gotEvent = true;
        onAgentAction(action);
      },
      onDone: (fullResponse) => {
        setConversationHistory((prev) => [
          ...prev,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: fullResponse },
        ]);
        setStreamingReply(null);
        setToolStatus(null);
        setIsLoading(false);
      },
      onError: async (err) => {
        console.error('Chat stream failed:', err);
        setStreamingReply(null);
        setToolStatus(null);
        if (err.dailyLimit) {
          // Retrying through the fallback would only hit the same limit.
          setError(t('common.dailyLimit'));
          if (!gotEvent && !overrideText) setMessage(userMessage);
          setIsLoading(false);
        } else if (gotEvent) {
          // Actions may already have been applied — don't replay the turn.
          setError(t('chat.errorInterrupted'));
          setIsLoading(false);
        } else {
          await sendMessageFallback(userMessage, overrideText);
          setIsLoading(false);
        }
      },
    });
  };

  return (
    <section className="chat-interface" aria-labelledby="chat-title">
      <div className="chat-header">
        <h2 id="chat-title">💬 {t('chat.title')}</h2>
        <p>{t('chat.subtitle')}</p>
      </div>

      <div className="chat-messages" role="log" aria-live="polite" aria-busy={isLoading}>
        {conversationHistory.length === 0 ? (
          <div className="welcome-message">
            <h3>{t('chat.welcomeTitle')}</h3>
            <p>{t('chat.welcomeBody')}</p>
            <p className="example">{t('chat.example')}</p>

            <div className="quick-actions">
              <p className="quick-actions-label">{t('chat.quickLabel')}</p>
              {QUICK_ACTIONS.map((key) => (
                <button
                  key={key}
                  className="quick-action-btn"
                  onClick={() => sendMessage(null, t(key))}
                  disabled={isLoading || !online}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          conversationHistory.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-header">
                <span className="message-role">{msg.role === 'user' ? t('chat.you') : t('chat.assistant')}</span>
              </div>
              <div className="message-content" dir="auto">
                {renderContent(msg.content)}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="message assistant">
            <div className="message-header">
              <span className="message-role">{t('chat.assistant')}</span>
            </div>
            <div className="message-content" dir="auto">
              {streamingReply && renderContent(streamingReply)}
              {toolStatus && <p className="tool-status">{t(`tool.${toolStatus}`)}</p>}
              {!streamingReply && !toolStatus && (
                <div className="typing-indicator" role="img" aria-label={t('chat.typing')}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {error && (
        <div className="chat-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={sendMessage} className="chat-input-form">
        <label htmlFor="chat-input" className="visually-hidden">
          {t('chat.inputLabel')}
        </label>
        <input
          id="chat-input"
          type="text"
          dir="auto"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={online ? t('chat.placeholder') : t('chat.placeholderOffline')}
          disabled={isLoading || !online}
          className="chat-input"
          autoComplete="off"
          maxLength={500}
        />
        <button type="submit" disabled={isLoading || !online || !message.trim()} className="send-button">
          {isLoading ? '…' : t('chat.send')}
        </button>
      </form>
    </section>
  );
}

export default ChatInterface;
