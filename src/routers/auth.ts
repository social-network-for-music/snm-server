import express, {
    Request,
    Response
} from "express";

import z from "zod";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import validateWithSchema from "./middlewares/validateWithSchema";

import User from "../models/User";

const SECRET = <string> process.env.EXPRESS_JWT_AUTHENTICATION_SECRET;

const router = express.Router();

router.post(
    "/login",
    validateWithSchema(z.object({
        email: z.string(),
        password: z.string()
    })),
    async (req: Request, res: Response) => {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user || !bcrypt.compareSync(password, user.hash))
            return res.status(401).json({ error: 
                "No user found with the given credentials." });

        const token = jwt.sign({ sub: user._id }, SECRET, {
            expiresIn: "2h"
        });

        return res.status(200).json({ token });
    }
);

export default router;
