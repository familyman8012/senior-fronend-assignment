import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/store/chatStore';

describe('chatStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useChatStore.setState({
      messages: [],
      isLoading: false,
      error: null,
      currentStreamingId: null,
    });
  });

  describe('message management', () => {
    it('should add a message', () => {
      const { addMessage } = useChatStore.getState();
      
      addMessage({
        role: 'user',
        content: 'Hello',
      });

      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
      expect(messages[0].id).toBeDefined();
      expect(messages[0].timestamp).toBeInstanceOf(Date);
    });

    it('should update a message', () => {
      const { addMessage, updateMessage } = useChatStore.getState();
      
      addMessage({
        role: 'assistant',
        content: 'Initial',
      });

      const messageId = useChatStore.getState().messages[0].id;
      
      updateMessage(messageId, {
        content: 'Updated',
        isStreaming: false,
      });

      const updatedMessage = useChatStore.getState().messages[0];
      expect(updatedMessage.content).toBe('Updated');
      expect(updatedMessage.isStreaming).toBe(false);
    });

    it('should delete a message', () => {
      const { addMessage, deleteMessage } = useChatStore.getState();
      
      addMessage({ role: 'user', content: 'Message 1' });
      addMessage({ role: 'assistant', content: 'Message 2' });

      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(2);

      deleteMessage(messages[0].id);
      
      const remainingMessages = useChatStore.getState().messages;
      expect(remainingMessages).toHaveLength(1);
      expect(remainingMessages[0].content).toBe('Message 2');
    });

    it('should clear all messages', () => {
      const { addMessage, clearMessages } = useChatStore.getState();
      
      addMessage({ role: 'user', content: 'Message 1' });
      addMessage({ role: 'assistant', content: 'Message 2' });
      
      expect(useChatStore.getState().messages).toHaveLength(2);
      
      clearMessages();
      
      expect(useChatStore.getState().messages).toHaveLength(0);
      expect(useChatStore.getState().error).toBeNull();
      expect(useChatStore.getState().currentStreamingId).toBeNull();
    });
  });

  describe('streaming functionality', () => {
    it('should append content to streaming message', () => {
      const { addMessage, appendToStreamingMessage } = useChatStore.getState();
      
      addMessage({
        role: 'assistant',
        content: 'Initial',
        isStreaming: true,
      });

      const messageId = useChatStore.getState().messages[0].id;
      
      appendToStreamingMessage(messageId, ' content');
      appendToStreamingMessage(messageId, ' added');

      const message = useChatStore.getState().messages[0];
      expect(message.content).toBe('Initial content added');
    });

    it('should manage streaming state', () => {
      const { setStreamingId } = useChatStore.getState();
      
      expect(useChatStore.getState().currentStreamingId).toBeNull();
      
      setStreamingId('test-id');
      expect(useChatStore.getState().currentStreamingId).toBe('test-id');
      
      setStreamingId(null);
      expect(useChatStore.getState().currentStreamingId).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should set and clear errors', () => {
      const { setError } = useChatStore.getState();
      
      setError('Test error');
      expect(useChatStore.getState().error).toBe('Test error');
      expect(useChatStore.getState().isLoading).toBe(false);
      
      setError(null);
      expect(useChatStore.getState().error).toBeNull();
    });
  });

  describe('message editing and regeneration', () => {
    it('should edit user message and delete subsequent messages', () => {
      const { addMessage, editMessage } = useChatStore.getState();
      
      addMessage({ role: 'user', content: 'First question' });
      const firstAssistantMsg = { role: 'assistant' as const, content: 'First answer' };
      addMessage(firstAssistantMsg);
      addMessage({ role: 'user', content: 'Second question' });
      addMessage({ role: 'assistant', content: 'Second answer' });

      const firstUserId = useChatStore.getState().messages[0].id;
      
      editMessage(firstUserId, 'Edited question');
      
      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Edited question');
    });

    it('should regenerate assistant message', () => {
      const { addMessage, regenerateMessage } = useChatStore.getState();
      
      addMessage({ role: 'user', content: 'Question' });
      addMessage({ role: 'assistant', content: 'Answer' });

      const assistantId = useChatStore.getState().messages[1].id;
      
      regenerateMessage(assistantId);
      
      const messages = useChatStore.getState().messages;
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
    });

    it('should not edit assistant messages', () => {
      const { addMessage, editMessage } = useChatStore.getState();
      
      addMessage({ role: 'assistant', content: 'Assistant message' });
      const assistantId = useChatStore.getState().messages[0].id;
      
      editMessage(assistantId, 'Should not change');
      
      const message = useChatStore.getState().messages[0];
      expect(message.content).toBe('Assistant message');
    });
  });
});