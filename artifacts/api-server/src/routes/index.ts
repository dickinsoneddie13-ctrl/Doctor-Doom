import { Router, type IRouter } from "express";
import { getDiscordBotStatus } from "../lib/discord";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.get("/bot-status", (_req, res) => {
  res.json(getDiscordBotStatus());
});

export default router;
