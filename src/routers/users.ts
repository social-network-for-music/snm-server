import express, {
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

import bcrypt from "bcryptjs";

import expressJwtAuthentication from "express-jwt-authentication";

import validateWithSchema from "./middlewares/validateWithSchema";

import Spotify from "../spotify";

import { BadRequestError } from "../errors";

import User from "../models/User";

import Playlist from "../models/Playlist";

const SDK = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID!,

    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!
});

const router = express.Router();

router.get(
    "/",
    expressJwtAuthentication({}),
    (req: Request, res: Response) => {
        User.findById(req.user!.sub)
            .then(user => res.json(user));
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
                .regex(/^(?=.{3,15}$)(?![\-_.])(?!.*[_.]{2})[a-zA-Z0-9._\-]+(?<![\-_.])$/,
                    "Your username can only contain alpha-numeric characters, dots \
                        dashes and underscores (and it must be between 3 and 15 \
                            characters long)."),

            password: z.string()
                .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,16}$/,
                    "Your password must contain at least one uppercase character, \
                        one lowercase character, a digit (and be between 8 and \
                            16 characters long).")
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
                .regex(/^(?=.{3,15}$)(?![\-_.])(?!.*[_.]{2})[a-zA-Z0-9._\-]+(?<![\-_.])$/,
                    "Your username can only contain alpha-numeric characters, dots \
                        dashes and underscores (and it must be between 3 and 15 \
                            characters long)."),

            artists: z.array(
                z.string()
                    .refine((id) => new Promise((resolve, reject) => {
                        SDK.artist(id)
                            .then(_ => resolve(true))
                            .catch(error => {
                                if (error.response?.status == 400 ||
                                        error.response?.status == 404)
                                    return resolve(false);

                                reject(error);
                            });
                    }))
            ),

            genres: z.array(
                z.string()
                    .trim()
                        .min(1, "You must provide a valid genre.")
            )
        })
            .partial()
            .strict()
    }),
    async (req: Request, res: Response, next: NextFunction) => {
        User.findByIdAndUpdate(req.user!.sub, req.body, { new: true })
            .then(user => res.json(user))
            .catch(error => next(error));
    }
);

router.delete(
    "/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        const owner = req.user!.sub;

        User.findByIdAndDelete(owner)
            .then(_ => {
                Playlist.deleteMany({ owner })
                    .then(_ => res.status(204).end())
                    .catch(error => next(error));
            })
            .catch(error => next(error));
    }
);

router.patch(
    "/password/",
    expressJwtAuthentication({}),
    validateWithSchema({
        body: z.object({
            password: z.string()
                .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,16}$/,
                    "Your password must contain at least one uppercase character, \
                        one lowercase character, a digit (and be between 8 and \
                            16 characters long)."),

            oldPassword: z.string()
        })
            .refine((obj) => obj.password != obj.oldPassword,
                "Your new password can't be equal to your current one.")
    }),
    async (req: Request, res: Response, next: NextFunction) => {
        const { password, oldPassword } = req.body;

        const user = await User.findById(req.user!.sub);

        if (!bcrypt.compareSync(oldPassword, user!.hash))
            return next(new BadRequestError(
                "Old password does not match your current one."));

        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        user!.hash = hash;

        await user!.save();

        res.status(204).end();
    }
);

export default router;
