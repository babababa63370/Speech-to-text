import { storage } from "../../storage";
import { conversations, messages } from "@shared/schema";

export interface IChatStorage {
  getConversation(id: number): Promise<any>;
  getAllConversations(): Promise<any[]>;
  createConversation(title: string): Promise<any>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<any[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<any>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    return (storage as any).getConversation(id);
  },

  async getAllConversations() {
    return (storage as any).getAllConversations();
  },

  async createConversation(title: string) {
    return (storage as any).createConversation(title);
  },

  async deleteConversation(id: number) {
    return (storage as any).deleteConversation(id);
  },

  async getMessagesByConversation(conversationId: number) {
    return (storage as any).getMessages(conversationId);
  },

  async createMessage(conversationId: number, role: string, content: string) {
    return (storage as any).createMessage({ conversationId, role, content });
  },
};

