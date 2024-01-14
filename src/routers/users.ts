import express, {
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

import bcryptjs from "bcryptjs";

import validateWithSchema from "./middlewares/validateWithSchema";

import User from "../models/User";

const router = express.Router();

router.post(
    "/",
    validateWithSchema(z.object({
        email: z.string()
            .email("You must provide a valid e-mail address.")
            .refine(async (email) => !(await User.findOne({ email })),
                "E-mail address already in use by another account."),

        username: z.string()
            .regex(/^(?=.{3,15}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/,
                "You must provide a valid username."),

        password: z.string()
            .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/,
                "You must provide a valid password.")
    })),
    (req: Request, res: Response, next: NextFunction) => {
        const { email, username, password } = req.body;

        const salt = bcryptjs.genSaltSync(10);
        const hash = bcryptjs.hashSync(password, salt);
        const user = new User({ email, username, hash });

        user.save()
            .then(data => res.status(201).json(data))
            .catch(error => next(error));
    }
);

export default router;
