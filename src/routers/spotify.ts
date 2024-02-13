import express, { 
    NextFunction,
    Request,
    Response 
} from "express";

import expressJwtAuthentication from "express-jwt-authentication";

import Spotify from "../spotify";

import { 
    BadRequestError,
    NotFoundError 
} from "../errors";

const SDK = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID!,

    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!
});

const router = express.Router();

router.get(
    "/tracks/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => { 
        SDK.tracks(<string> req.query.q)
            .then(tracks => res.json(tracks))
            .catch(error => {
                if (error.response?.status == 400)
                    return next(new BadRequestError(
                        "You must provide a valid query."));

                next(error);
            });
    }
);

router.get(
    "/artists/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        SDK.artists(<string> req.query.q)
            .then(artists => res.json(artists))
            .catch(error => {
                if (error.response?.status == 400)
                    return next(new BadRequestError(
                        "You must provide a valid query."));

                next(error);
            });
    }
);

router.get(
    "/genres/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => { 
        SDK.genres()
            .then(genres => res.json(genres))
            .catch(error => next(error));
    }
);

router.get(
    "/tracks/:id/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        SDK.track(req.params.id)
            .then(track => res.json(track))
            .catch(error => {
                if (error.response?.status == 400)
                    return next(new BadRequestError(
                        "You must provide a valid ID."));

                if (error.response?.status == 404)
                    return next(new NotFoundError(
                        "Can't find a track with the given ID."));

                next(error);
            });
    }
);

export default router;