import { GoogleGenerativeAI } from '@google/generative-ai';
import env from '../config/environment';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private chatHistory: Map<string, any[]> = new Map();

  constructor() {
    if (!env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not configured. Chatbot will not function.');
      this.genAI = new GoogleGenerativeAI('dummy-key');
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    }
  }

  private getSystemPrompt(): string {
    return `You are a helpful customer service chatbot for Carus, a recycling and waste management platform.

Your role is to assist users with questions about:
- Recycling schedules and pickups
- Points and rewards system
- How to earn points through recycling
- Donation campaigns
- Account management
- General information about Carus services

Key information about Carus:
- Users can schedule pickups for recyclable materials
- Users earn points for recycling activities
- Points can be redeemed for rewards
- Carus runs donation campaigns for environmental causes
- Users can track their recycling history and wallet balance

Guidelines:
- Be friendly, helpful, and professional
- Provide accurate information about Carus services
- If you don't know specific details, suggest contacting support
- Keep responses concise and easy to understand
- Do not access user-specific data (provide general information only)
- Do not make up information about specific user accounts or transactions

If users ask about account-specific details (like their points balance, schedules, etc.), politely explain that you can provide general guidance but they should check their account dashboard for specific information.`;
  }

  private getChatHistory(sessionId: string): any[] {
    return this.chatHistory.get(sessionId) || [];
  }

  private setChatHistory(sessionId: string, history: any[]): void {
    this.chatHistory.set(sessionId, history);
  }

  public async sendMessage(
    message: string,
    sessionId: string = 'default'
  ): Promise<{ response: string; error?: string }> {
    try {
      if (!this.model) {
        return {
          response: 'Chatbot service is not configured. Please contact support.',
          error: 'Service not configured',
        };
      }

      const chatHistory = this.getChatHistory(sessionId);

      // Start chat with system prompt
      const chat = this.model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: this.getSystemPrompt() }],
          },
          {
            role: 'model',
            parts: [{ text: 'I understand. I\'m ready to help users with Carus-related questions.' }],
          },
          ...chatHistory,
        ],
      });

      const result = await chat.sendMessage(message);
      const response = result.response;
      const text = response.text();

      // Update chat history
      chatHistory.push(
        { role: 'user', parts: [{ text: message }] },
        { role: 'model', parts: [{ text }] }
      );

      // Keep only last 10 messages to manage memory
      if (chatHistory.length > 20) {
        chatHistory.splice(0, chatHistory.length - 20);
      }

      this.setChatHistory(sessionId, chatHistory);

      return { response: text };
    } catch (error) {
      console.error('Gemini API error:', error);
      return {
        response: 'I apologize, but I encountered an error processing your request. Please try again or contact support.',
        error: 'API error',
      };
    }
  }

  public async sendFeedback(
    sessionId: string,
    message: string,
    feedback: 'positive' | 'negative'
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Log feedback for improvement (could be stored in database)
      console.log(`Chatbot feedback - Session: ${sessionId}, Feedback: ${feedback}, Message: ${message}`);

      return {
        success: true,
        message: 'Thank you for your feedback!',
      };
    } catch (error) {
      console.error('Error logging feedback:', error);
      return {
        success: false,
        message: 'Failed to log feedback',
      };
    }
  }

  public clearChatHistory(sessionId: string): void {
    this.chatHistory.delete(sessionId);
  }

  public clearAllChatHistory(): void {
    this.chatHistory.clear();
  }
}

export const geminiService = new GeminiService();