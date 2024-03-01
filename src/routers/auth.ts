import express, {
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import expressJwtAuthentication from "express-jwt-authentication";

import validateWithSchema from "./middlewares/validateWithSchema";

import User from "../models/User";

import { UnauthorizedError } from "../errors";

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
        /*  #swagger.summary = "Logs user into the service"

            #swagger.parameters["body"] = {
                in: "body",

                schema: {
                    email: "gordon.freeman@hotmail.com",
                    password: "•••••••••••••••",
                    rememberMe: false
                }
            }

            #swagger.responses[200] = {
                schema: {
                    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NWEzMTA1ZTI5YzY1MTZhYjJkZDFiMzgiLCJpYXQiOjE3MDkyNDI5NjMsImV4cCI6MTcxMTgzNDk2M30.CpIiQ12Jm5hg32hZmDs8tD8--vCeP1fY54TeuX_6YlQ"
                }
            }

            #swagger.responses[400]

            #swagger.responses[401]
        */

        const { email, password, rememberMe } = req.body;

        const user = await User.findOne(
            { email: email.toLowerCase() });

        if (!user || !bcrypt.compareSync(password, user.hash))
            return next(new UnauthorizedError(
                "No user found with the given credentials."));

        const token = jwt.sign({ sub: user._id }, SECRET, {
            expiresIn: !rememberMe ? "2h" : "30d"
        });

        return res.json({ token });
    }
);

router.head(
    "/verify/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        /*  #swagger.summary = "Checks if the user's token is still valid"

            #swagger.responses[204]

            #swagger.security = [{
                "JWT": []
            }]
        */

        res.status(204).end();
    }
);

export default router;
