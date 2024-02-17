import express, {
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import validateWithSchema from "./middlewares/validateWithSchema";

import User from "../models/User";

import { NotFoundError } from "../errors";

const SECRET = process.env.EXPRESS_JWT_AUTHENTICATION_SECRET!;

const router = express.Router();

router.post(
    "/login/",
    validateWithSchema({
        body: z.object({
            email: z.string(),
            password: z.string(),
            rememberMe: z.boolean()
                .optional()
        })
    }),
    async (req: Request, res: Response, next: NextFunction) => {
        const { email, password, rememberMe } = req.body;

        const user = await User.findOne({ email });

        if (!user || !bcrypt.compareSync(password, user.hash))
            return next(new NotFoundError(
                "No user found with the given credentials."));

        const token = jwt.sign({ sub: user._id }, SECRET, {
            expiresIn: !rememberMe ? "2h" : "30d"
        });

        return res.json({ token });
    }
);

export default router;
