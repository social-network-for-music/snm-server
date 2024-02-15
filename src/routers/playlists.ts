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
        ((req: Request, res: Response, next: NextFunction) => Promise<void>)[] {
    return [
        validateWithSchema({
            params: z.object({
                id: z.string()
                    .regex(/^[0-9a-fA-F]{24}$/,
                        "You must provide a valid playlist ID.")
            })
        }),
        async (req: Request, _: Response, next: NextFunction): Promise<void> => {
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
        }
    ];
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
    requirePlaylist({ owner: true }),
    validateWithSchema({
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
    requirePlaylist({ owner: true }),
    validateWithSchema({
        params: z.object({
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
    (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        const update = { 
            $addToSet: { 
                tracks: req.params.track 
            } 
        };

        Playlist.findByIdAndUpdate(_id, update, { new: true })
            .then(playlist => res.json(playlist))
            .catch(error => next(error));
    }
);

router.patch(
    "/:id/remove/:track/",
    expressJwtAuthentication({}),
    requirePlaylist({ owner: true }),
    validateWithSchema({
        params: z.object({
            track: z.string()
        })
    }),
    async (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        const update = { 
            $pull: { 
                tracks: req.params.track 
            } 
        };

        Playlist.findByIdAndUpdate(_id, update, { new: true })
            .then(playlist => res.json(playlist))
            .catch(error => next(error));
    }
);

router.patch(
    "/:id/follow/",
    expressJwtAuthentication({}),
    requirePlaylist({ public: true }),
    async (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        const playlist = await Playlist.findById(_id);

        if (req.user!.sub == playlist!.owner.toString())
            return next(new BadRequestError(
                "You can't follow your own playlists!"));

        const update = { 
            $addToSet: { 
                followers: req.user!.sub
            } 
        };

        Playlist.findByIdAndUpdate(_id, update, { new: true })
            .then(playlist => res.json(playlist))
            .catch(error => next(error));
    }
);

router.patch(
    "/:id/unfollow/",
    expressJwtAuthentication({}),
    requirePlaylist({ public: true }),
    async (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        const playlist = await Playlist.findById(_id);

        if (req.user!.sub == playlist!.owner.toString())
            return next(new BadRequestError(
                "You can't unfollow your own playlists!"));

        const update = { 
            $pull: { 
                followers: req.user!.sub
            } 
        };

        Playlist.findByIdAndUpdate(_id, update, { new: true })
            .then(playlist => res.json(playlist))
            .catch(error => next(error));
    }
);

export default router;
