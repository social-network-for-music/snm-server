import express, {
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

import expressJwtAuthentication from "express-jwt-authentication";

import validateWithSchema from "./middlewares/validateWithSchema";

import User from "../models/User";

import Playlist from "../models/Playlist";

const router = express.Router();

router.get(
    "/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        Playlist.find({ owner: req.user!.sub })
            .then(playlists => res.json(playlists))
            .catch(error => next(error));
    }
);

router.post(
    "/",
    expressJwtAuthentication({}),
    validateWithSchema({
        body: z.object({
            title: z.string()
                .regex(/^[\w\s\-.,!?:]{3,25}$/,
                    "You must provide a valid title."),

            description: z.string()
                .nullish(),
            
            public: z.boolean()
        })
            .strict()
    }),
    (req: Request, res: Response, next: NextFunction) => {
        const playlist = new Playlist({
            owner: req.user!.sub,
            
            ...req.body
        });

        playlist.save()
            .then(data => res.status(201).json(data))
            .catch(error => next(error));
    }
);

export default router;
