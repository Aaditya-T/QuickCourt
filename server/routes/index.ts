import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuthRoutes } from "./auth";
import { registerUserRoutes } from "./user";
import { registerFacilityRoutes } from "./facility";
import { registerBookingRoutes } from "./booking";
// import { registerMatchRoutes } from "./match";
import { registerAdminRoutes } from "./admin";
import { registerPaymentRoutes } from "./payment";
import { registerUtilityRoutes } from "./utility";
import { authenticateToken, requireRole } from "./middleware";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAuthRoutes(app);
  registerUserRoutes(app, authenticateToken);
  registerFacilityRoutes(app, authenticateToken, requireRole);
  registerBookingRoutes(app, authenticateToken);
  // registerMatchRoutes(app, authenticateToken);
  registerAdminRoutes(app, authenticateToken, requireRole);
  registerPaymentRoutes(app, authenticateToken);
  registerUtilityRoutes(app, authenticateToken, requireRole);

  const httpServer = createServer(app);

  return httpServer;
}
