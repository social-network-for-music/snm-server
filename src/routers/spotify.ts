import express, { 
    Request,
    Response 
} from "express";

import z from "zod";

import expressJwtAuthentication from "express-jwt-authentication";

import validateWithSchema from "./middlewares/validateWithSchema";

import Spotify from "../spotify";

const SDK = new Spotify({
    clientId: process.env.SPOTIFY_CLIENT_ID!,

    clientSecret: process.env.SPOTIFY_CLIENT_SECRET!
});

const router = express.Router();

router.get(
    "/tracks",
    expressJwtAuthentication({}),
    validateWithSchema({
        query: z.object({
            q: z.string().min(1, 
                "You must provide a valid query.")
        })
    }),
    (req: Request, res: Response) => { 
        SDK.tracks(<string> req.query.q).then(
            tracks => res.json(tracks));
    }
);

router.get(
    "/artists",
    expressJwtAuthentication({}),
    validateWithSchema({
        query: z.object({
            q: z.string().min(1, 
                "You must provide a valid query.")
        })
    }),
    (req: Request, res: Response) => { 
        SDK.artists(<string> req.query.q).then(
            artists => res.json(artists));
    }
);

router.get(
    "/genres",
    expressJwtAuthentication({}),
    (req: Request, res: Response) => { 
        SDK.genres().then(genres => 
            res.json(genres));
    }
);

export default router;