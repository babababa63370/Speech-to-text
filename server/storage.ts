import { type User, type InsertUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat integration methods
  getConversation(id: number): Promise<any>;
  getAllConversations(): Promise<any[]>;
  createConversation(title: string): Promise<any>;
  deleteConversation(id: number): Promise<void>;
  getMessages(conversationId: number): Promise<any[]>;
  createMessage(data: { conversationId: number; role: string; content: string }): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<number, any>;
  private messages: any[];
  private currentConvId: number = 1;
  private currentMsgId: number = 1;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Chat integration implementations
  async getConversation(id: number) {
    return this.conversations.get(id);
  }

  async getAllConversations() {
    return Array.from(this.conversations.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createConversation(title: string) {
    const id = this.currentConvId++;
    const conversation = {
      id,
      title,
      createdAt: new Date().toISOString()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async deleteConversation(id: number) {
    this.conversations.delete(id);
    this.messages = this.messages.filter(m => m.conversationId !== id);
  }

  async getMessages(conversationId: number) {
    return this.messages
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async createMessage(data: { conversationId: number; role: string; content: string }) {
    const id = this.currentMsgId++;
    const message = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    this.messages.push(message);
    return message;
  }
}

export const storage = new MemStorage();
