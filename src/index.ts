import express, { 
    NextFunction,
    Request,
    Response
} from "express";

import cors from "cors";
import { ZodError } from "zod";
import { AxiosError } from "axios";

import mongoose from "mongoose";

import swaggerUi from "swagger-ui-express";

import swaggerDocument from "../swagger/output.json";

import "dotenv/config";

import auth from "./routers/auth";

import users from "./routers/users";
import playlists from "./routers/playlists";
import spotify from "./routers/spotify";

import { 
    HttpError,
    BadRequestError,
    UnauthorizedError,

    TooManyRequestsError
} from "./errors";

const app = express();

const port = process.env.PORT || 3500;

app.use(cors());

app.use(express.json());

app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
);

app.use("/api/auth", auth
    // #swagger.tags = ["auth"]
);

app.use("/api/users", users
    /*  #swagger.tags = ["user"]

        #swagger.security = [{
            "JWT": []
        }]
    */
);

app.use("/api/playlists", playlists
    /*  #swagger.tags = ["playlist"]

        #swagger.security = [{
            "JWT": []
        }]
    */
);

app.use("/api/spotify", spotify
    /*  #swagger.tags = ["spotify"]

        #swagger.security = [{
            "JWT": []
        }]
    */
);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ZodError)
        return next(new BadRequestError(
            error.errors[0].message));

    next(error);
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof AxiosError)
        if (error.response?.status == 429)
            return next(new TooManyRequestsError(
                "Too many requests, try again later..."));

    next(error);
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    switch(error.name) {
        case "JsonWebTokenError":
        case "NotBeforeError":
        case "TokenExpiredError":

        case "MissingAuthorizationHeaderError":
        case "InvalidAuthorizationHeaderError":
        case "MissingTokenError":
        case "RevokedTokenError":
        case "ClaimNotAllowedError":
            return next(new UnauthorizedError(
                error.message));
    }

    next(error);
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof HttpError) {
        res.status(error.code);

        return res.json({
            error: error.message
        });
    }

    next(error);
});

app.use((error: Error, req: Request, res: Response, _: NextFunction) => {
    console.log(error);

    res.status(500);

    return res.json({
        error: "Internal server error: try again later..."
    }); 
});

app.get("/api/ping", (_: Request, res: Response) => {
    // #swagger.tags = ["general"]

    res.json({ ping: 1 });
})

app.listen(port, () => {
    mongoose.connect(process.env.MONGODB_URI ||
        "mongodb://127.0.0.1:27017/snm");

    console.log(`SNM's server is now online on port ${port}.`);
});