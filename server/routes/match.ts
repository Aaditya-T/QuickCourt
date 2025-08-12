import type { Express } from "express";
import { storage } from "../storage";
import { insertMatchSchema } from "@shared/schema";

export function registerMatchRoutes(app: Express, authenticateToken: any) {
  // Match routes
  app.get("/api/matches", async (req, res) => {
    try {
      const { city, sportType, skillLevel } = req.query;
      const matches = await storage.getMatches({
        city: city as string,
        sportType: sportType as string,
        skillLevel: skillLevel as string,
      });
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Failed to get matches", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      res.status(500).json({ message: "Failed to get match", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/matches", authenticateToken, async (req: any, res) => {
    try {
      const matchData = insertMatchSchema.parse({
        ...req.body,
        creatorId: req.user.userId,
      });
      
      const match = await storage.createMatch(matchData);
      res.status(201).json(match);
    } catch (error) {
      res.status(400).json({ message: "Invalid match data", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.post("/api/matches/:id/join", authenticateToken, async (req: any, res) => {
    try {
      const match = await storage.getMatch(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      if ((match.currentPlayers || 0) >= match.maxPlayers) {
        return res.status(400).json({ message: "Match is already full" });
      }

      const participant = await storage.joinMatch(req.params.id, req.user.userId);
      res.status(201).json(participant);
    } catch (error) {
      res.status(500).json({ message: "Failed to join match", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.delete("/api/matches/:id/leave", authenticateToken, async (req: any, res) => {
    try {
      const success = await storage.leaveMatch(req.params.id, req.user.userId);
      if (success) {
        res.json({ message: "Left match successfully" });
      } else {
        res.status(400).json({ message: "Failed to leave match" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to leave match", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });
}
