import express, {
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

import expressJwtAuthentication from "express-jwt-authentication";

import validateWithSchema from "./middlewares/validateWithSchema";

import Spotify from "../spotify";

import { BadRequestError, ForbiddenError, NotFoundError } from "../errors";

import Playlist from "../models/Playlist";

const SDK = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID!,

    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!
});

const router = express.Router();

function requirePlaylist(options: { public?: boolean, owner?: boolean }): 
        (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, _: Response, next: NextFunction): Promise<void> => {
        const playlist = await Playlist.findOne({
            _id: req.params.id,

            public: options.public ??
                { $exists: true }
        });

        if (!playlist)
            return next(new NotFoundError(
                `No playlist found with ID: ${req.params.id}.`));

        if (options.owner)
            if (req.user!.sub != playlist.owner.toString())
                return next(new ForbiddenError(
                    "You are not the owner of this playlist!"));

        next();
    };
}

router.get(
    "/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        Playlist.find({ owner: req.user!.sub })
            .populate("owner", "-email -artists -genres")
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

router.patch(
    "/:id/",
    expressJwtAuthentication({}),
    validateWithSchema({
        params: z.object({
            id: z.string()
                .regex(/^[0-9a-fA-F]{24}$/,
                    "You must provide a valid playlist ID.")
        }),

        body: z.object({
            title: z.string()
                .regex(/^[\w\s\-.,!?:]{3,25}$/,
                    "You must provide a valid title."),

            description: z.string()
                .nullable(),
            
            tags: z.array(
                z.string()
                    .regex(/^[a-zA-Z_]{3,12}$/)
            )
        })
            .partial()
            .strict()
    }),
    requirePlaylist({ owner: true }),
    async (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        Playlist.findByIdAndUpdate(_id, req.body, { new: true })
            .then(playlist => res.json(playlist))
            .catch(error => next(error));
    }
);

router.delete(
    "/:id/",
    expressJwtAuthentication({}),
    validateWithSchema({
        params: z.object({
            id: z.string()
                .regex(/^[0-9a-fA-F]{24}$/,
                    "You must provide a valid playlist ID.")
        })
    }),
    requirePlaylist({ owner: true }),
    (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        Playlist.findByIdAndDelete(_id)
            .then(_ => res.status(204).end())
            .catch(error => next(error));
    }
);

router.patch(
    "/:id/add/:track/",
    expressJwtAuthentication({}),
    validateWithSchema({
        params: z.object({
            id: z.string()
                .regex(/^[0-9a-fA-F]{24}$/,
                    "You must provide a valid playlist ID."),

            track: z.string()
                .refine((id) => new Promise((resolve, reject) => {
                    SDK.track(id)
                        .then(_ => resolve(true))
                        .catch(error => {
                            if (error.response?.status == 400 ||
                                    error.response?.status == 404)
                                return resolve(false);

                            reject(error);
                        });
                }))
        })
    }),
    requirePlaylist({ owner: true }),
    async (req: Request, res: Response, next: NextFunction) => {
        const playlist = await Playlist.findById(req.params.id);

        if (playlist!.tracks.includes(req.params.track))
            return next(new BadRequestError(
                "This track is already in your playlist."));

        playlist!.tracks.push(req.params.track);

        await playlist!.save();

        res.json(playlist);
    }
);

export default router;
