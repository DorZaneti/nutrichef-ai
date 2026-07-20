import { deviceId } from '../hooks/useDeviceId';

// SSE chat streaming — plain fetch + ReadableStream since axios doesn't
// support streamed responses in the browser. Same base URL as api/client.js.
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function streamChat({
  message,
  conversationHistory,
  currentIngredients,
  onDelta,
  onIngredients,
  onDone,
  onError,
}) {
  try {
    const response = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
      body: JSON.stringify({
        message,
        conversation_history: conversationHistory,
        current_ingredients: currentIngredients,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';

      for (const frame of frames) {
        if (!frame.trim()) continue;
        let eventName = 'message';
        let data = '';
        for (const line of frame.split('\n')) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data) continue;

        const parsed = JSON.parse(data);
        if (eventName === 'delta') onDelta?.(parsed.text);
        else if (eventName === 'ingredients') onIngredients?.(parsed.extracted_ingredients || []);
        else if (eventName === 'done') onDone?.(parsed.response);
        else if (eventName === 'error') throw new Error(parsed.detail || 'Stream error');
      }
    }
  } catch (error) {
    onError?.(error);
  }
}
