import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import aiRouter from "./ai";
import templatesRouter from "./templates";
import statsRouter from "./stats";
import documentsRouter from "./documents";
import storageRouter from "./storage";
import libraryRouter from "./library";
import adminLibraryRouter from "./admin-library";
import versionsRouter from "./versions";
import presentationRouter from "./presentation";
import crmRouter from "./crm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(aiRouter);
router.use(templatesRouter);
router.use(statsRouter);
router.use(documentsRouter);
router.use(storageRouter);
router.use(libraryRouter);
router.use(adminLibraryRouter);
router.use(versionsRouter);
router.use(presentationRouter);
router.use(crmRouter);

export default router;
