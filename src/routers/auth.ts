import express, {
    Request,
    Response
} from "express";

import z from "zod";

import bcryptjs from "bcryptjs";

import validateWithSchema from "./middlewares/validateWithSchema";

import User from "../models/User";

const router = express.Router();

router.post(
    "/login",
    validateWithSchema(z.object({
        email: z.string(),
        password: z.string()
    })),
    async (req: Request, res: Response) => {
        
    }
);

export default router;
