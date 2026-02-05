import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import express from "express";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerImageRoutes } from "./replit_integrations/image";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAudioRoutes(app);
  registerImageRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
