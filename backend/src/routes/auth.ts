import express from "express";
import { authController } from "../controllers/authController";

const router = express.Router();

router.post("/signup", (req, res) => authController.signUp(req, res));
router.post("/signin", (req, res) => authController.signIn(req, res));

export default router;

