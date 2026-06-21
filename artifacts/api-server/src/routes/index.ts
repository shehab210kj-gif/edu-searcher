import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import aiRouter from "./ai";
import templatesRouter from "./templates";
import statsRouter from "./stats";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(aiRouter);
router.use(templatesRouter);
router.use(statsRouter);
router.use(documentsRouter);

export default router;
