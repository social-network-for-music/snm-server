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

import User, { IUser } from "../models/User";

const SDK = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID!,

    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!
});

function favorites(user: IUser): [string[], string[]] {
    if (user.artists.length + user.genres.length <= 5)
        return [user.artists, user.genres];

    const items = [
        ...user.artists.map(artist => ({ value: artist, source: "artist" })),
        ...user.genres.map(genre => ({ value: genre, source: "genre" }))
    ];

    const artists: string[] = [ ],
          genres:  string[] = [ ];

    for (let i = 0; i < 5; i++) {
        const index = Math.floor(
            Math.random() * items.length);

        if (items[index].source == "artist")
            artists.push(items[index].value);
        else if (items[index].source == "genre")
            genres.push(items[index].value);

        items.splice(index, i);
    }

    return [artists, genres];
}

const router = express.Router();

router.get(
    "/tracks/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        /*  #swagger.summary = "Allows to search spotify's tracks"

            #swagger.parameters["q"] = {
                description: "Searches tracks that match the following query"
            }

            #swagger.responses[200] = {
                schema: [{
                    $ref: "#/definitions/Track"
                }]
            }

            #swagger.responses[400]
        */

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
        /*  #swagger.summary = "Allows to search spotify's artists"

            #swagger.parameters["q"] = {
                description: "Searches artists that match the following query"
            }

            #swagger.responses[200] = {
                schema: [{
                    $ref: "#/definitions/Artist"
                }]
            }

            #swagger.responses[400]
        */

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
        /*  #swagger.summary = "Retrieves all spotify's genres"

            #swagger.responses[200] = {
                schema: {
                    genres: [
                        "acoustic",
                        "afrobeat",
                        "alt-rock",
                        "..."
                    ]
                }
            }
        */

        SDK.genres()
            .then(genres => res.json(genres))
            .catch(error => next(error));
    }
);

router.get(
    "/recommendations/",
    expressJwtAuthentication({}),
    async (req: Request, res: Response, next: NextFunction) => {
        /*  #swagger.summary = "Returns the current user's recommendations"

            #swagger.responses[200] = {
                schema: [{
                    $ref: "#/definitions/Track"
                }]
            }

            #swagger.responses[400]
        */

        const user = await User.findById(req.user!.sub);

        const [artists, genres] = favorites(user!);

        SDK.recommendations(artists, genres)
            .then(tracks => res.json(tracks))
            .catch(error => {
                if (error.response?.status == 400)
                    return next(new BadRequestError(
                        "You don't have any favorite artist or genre."));

                next(error);
            });
    }
);

router.get(
    "/tracks/:id/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        /*  #swagger.summary = "Retrieves a spotify's track"

            #swagger.parameters["id"] = {
                in: "path",
                required: "true",
                description: "A track\'s ID"
            }

            #swagger.responses[200] = {
                schema: {
                    $ref: "#/definitions/Track"
                }
            }

            #swagger.responses[400]

            #swagger.responses[404]
        */

        SDK.track(req.params.id)
            .then(track => res.json(track))
            .catch(error => {
                if (error.response?.status == 400)
                    return next(new BadRequestError(
                        "You must provide a valid ID."));

                if (error.response?.status == 404)
                    return next(new NotFoundError(
                        "No track found with the given ID."));

                next(error);
            });
    }
);

router.get(
    "/artists/:id/",
    expressJwtAuthentication({}),
    (req: Request, res: Response, next: NextFunction) => {
        /*  #swagger.summary = "Retrieves a spotify's artist"

            #swagger.parameters["id"] = {
                in: "path",
                required: "true",
                description: "An artist\'s ID"
            }

            #swagger.responses[200] = {
                schema: {
                    $ref: "#/definitions/Artist"
                }
            }

            #swagger.responses[400]

            #swagger.responses[404]
        */

        SDK.artist(req.params.id)
            .then(artist => res.json(artist))
            .catch(error => {
                if (error.response?.status == 400)
                    return next(new BadRequestError(
                        "You must provide a valid ID."));

                if (error.response?.status == 404)
                    return next(new NotFoundError(
                        "No artist found with the given ID."));

                next(error);
            });
    }
);

export default router;