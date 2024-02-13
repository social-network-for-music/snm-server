import express, {
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

import bcrypt from "bcryptjs";

import expressJwtAuthentication from "express-jwt-authentication";

import validateWithSchema from "./middlewares/validateWithSchema";

import User from "../models/User";

const router = express.Router();

router.get(
    "/",
    expressJwtAuthentication({}),
    (req: Request, res: Response) => {
        User.findById(req.user!.sub)
            .then(user => res.status(200).json(user));
    }
);

router.post(
    "/",
    validateWithSchema({
        body: z.object({
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
        })
    }),
    (req: Request, res: Response, next: NextFunction) => {
        const { email, username, password } = req.body;

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const user = new User({ email, username, hash });

        user.save()
            .then(data => res.status(201).json(data))
            .catch(error => next(error));
    }
);

router.patch(
    "/",
    expressJwtAuthentication({}),
    validateWithSchema({
        body: z.object({
            username: z.string()
                .regex(/^(?=.{3,15}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/,
                    "You must provide a valid username."),
        })
    }),
    async (req: Request, res: Response, next: NextFunction) => {
        const { username } = req.body;

        const user = await User.findById(req.user!.sub);
            
        user!.username = username;

        user!.save()
            .then(data => res.status(200).json(data))
            .catch(error => next(error));
    }
);

router.delete(
    "/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        User.findByIdAndDelete(req.user!.sub)
            .then(_ => res.status(204).end())
            .catch(error => next(error));
    }
);

router.patch(
    "/password/",
    expressJwtAuthentication({}),
    validateWithSchema({
        body: z.object({
            password: z.string()
                .regex(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.* ).{8,16}$/,
                    "You must provide a valid password."),

            oldPassword: z.string()
        })
            .refine((obj) => obj.password != obj.oldPassword,
                "Your new password can't be equal to your current one.")
    }),
    async (req: Request, res: Response) => {
        const { password, oldPassword } = req.body;

        const user = await User.findById(req.user!.sub);

        if (!bcrypt.compareSync(oldPassword, user!.hash))
            return res.status(400).json({ error: 
                "Old password does not match your current one." });

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        user!.hash = hash;

        await user!.save();

        res.status(204).json();
    }
);

export default router;
