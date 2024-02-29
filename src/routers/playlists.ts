import express, {
    NextFunction,
    Request,
    Response
} from "express";

import { FilterQuery } from "mongoose";

import z from "zod";

import expressJwtAuthentication from "express-jwt-authentication";

import validateWithSchema from "./middlewares/validateWithSchema";

import Spotify from "../spotify";

import { 
    BadRequestError,
    ForbiddenError,
    NotFoundError 
} from "../errors";

import Playlist, { IPlaylist } from "../models/Playlist";

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

                ...options.public ? { public: true } : { }
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

function requireAccess(): ((req: Request, res: Response, next: NextFunction) => Promise<void>)[] {
    return [
        ...requirePlaylist({ }),
        async (req: Request, _: Response, next: NextFunction): Promise<void> => {
            const playlist = await Playlist.findOne({
                _id: req.params.id,
        
                $or: [
                    { owner: req.user!.sub },
                    { public: true }
                ]
            });
        
            if (!playlist)
                return next(new ForbiddenError(
                    "You can't access this playlist!"));
        
            next();
        }
    ];
}

router.get(
    "/search/",
    expressJwtAuthentication({}),
    validateWithSchema({
        query: z.object({
            title: z.string(),
            tag: z.string(),
            track: z.string()
        })
            .partial()
    }),
    (req: Request, res: Response, next: NextFunction) => {
        const { 
            title,
            tag,
            track
        } = req.query;

        const filter: FilterQuery<IPlaylist> = { 
            public: true,

            ...title ? { 
                title: { $regex: title, $options: "i" } 
            } : { },

            ...tag ? { 
                tags: { 
                    $elemMatch: { $regex: tag, $options: "i" } 
                } 
            } : { },

            ...track ? { 
                tracks: {
                    $elemMatch: { 
                        name: { $regex: track, $options: "i" } 
                    } 
                } 
            } : { }
        };

        Playlist.getPreviews(filter)
            .populate("owner", "-email -artists -genres")
            .then(playlists => res.json(playlists))
            .catch(error => next(error));
    }
);

router.get(
    "/",
    expressJwtAuthentication({}),
    validateWithSchema({
        query: z.object({
            select: z.enum([ "all", "owner", "follower" ])
                .optional()
        })
    }),
    (req: Request, res: Response, next: NextFunction) => {
        const select = req.query.select || "all";

        const selectOwner = select == "owner" || select == "all";

        const selectFollower = select == "follower" || select == "all";

        const filter: FilterQuery<IPlaylist> = { 
            $or: [ 
                { owner: selectOwner ? req.user!.sub : undefined },
                { followers: selectFollower ? req.user!.sub : undefined }
            ] 
        };

        Playlist.getPreviews(filter)
            .populate("owner", "-email -artists -genres")
            .then(playlists => res.json(playlists))
            .catch(error => next(error));
    }
);

router.get(
    "/:id/",
    expressJwtAuthentication({}),
    requireAccess(),
    (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        Playlist.findById(_id)
            .populate("owner", "-email -artists -genres")
            .then(playlist => res.json(playlist))
    }
);

router.get(
    "/:id/thumbnail/",
    expressJwtAuthentication({}),
    requireAccess(),
    (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        Playlist.findById(_id)
            .then(playlist => {
                res.json(playlist!.thumbnail());
            });
    }
);

router.post(
    "/",
    expressJwtAuthentication({}),
    validateWithSchema({
        body: z.object({
            title: z.string()
                .trim()
                    .min(1, "The title can't be an empty string!")
                    .min(3, "The title can't be shorter than 3 characters.")
                    .max(30, "The title can't be longer than 30 characters."),

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
                .trim()
                    .min(1, "The title can't be an empty string!")
                    .min(3, "The title can't be shorter than 3 characters.")
                    .max(30, "The title can't be longer than 30 characters."),

            description: z.string()
                .nullable(),
            
            tags: z.array(
                z.string()
                    .regex(/^[a-zA-Z0-9\-]{3,15}$/,
                        "A tag can only contain alpha-numeric characters \
                            and dashes (and it must be between 3 and 15 \
                                characters long).")
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

router.patch(
    "/:id/add/:track/",
    expressJwtAuthentication({}),
    requirePlaylist({ owner: true }),
    validateWithSchema({
        params: z.object({
            track: z.string()
        })
    }),
    (req: Request, res: Response, next: NextFunction) => {
        function remove(track: unknown): void {
            const _id = req.params.id;

            const update = { 
                $addToSet: { 
                    tracks: track
                } 
            };

            Playlist.findByIdAndUpdate(_id, update, { new: true })
                .then(playlist => res.json(playlist))
                .catch(error => next(error)); 
        }

        SDK.track(req.params.track)
            .then(track => remove(track))
            .catch(error => {
                if (error.response?.status == 400)
                    return next(new BadRequestError(
                        "You must provide a valid ID."));

                if (error.response?.status == 404)
                    return next(new NotFoundError(
                        "No track found with the given ID."));

                next(error);
            })
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
    (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        const update = { 
            $pull: { 
                tracks: { 
                    id: req.params.track 
                }
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

        Playlist.findById(_id)
            .then(playlist => {
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
            });
    }
);

router.patch(
    "/:id/unfollow/",
    expressJwtAuthentication({}),
    requirePlaylist({ public: true }),
    (req: Request, res: Response, next: NextFunction) => {
        const _id = req.params.id;

        Playlist.findById(_id)
            .then(playlist => {
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
            });
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

export default router;
