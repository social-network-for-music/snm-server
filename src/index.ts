import express, { 
    NextFunction,
    Request,
    Response
} from "express";

import { ZodError } from "zod";

import users from "./routers/users";

import "dotenv/config";

const app = express();

const port = process.env.PORT || 3500;

app.use(express.json());

app.use("/api/users", users);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    switch (err.name) {
        case "ZodError":
            res.status(400);

            return res.json({
                errors: Object.fromEntries((<ZodError>err).errors.map(
                    error => [ error.path[0], error.message ]))
            });
    }
});

app.get("/api/ping", (_: Request, res: Response) => {
    res.json({ ping: 1 });
})

app.listen(port, () => {
    console.log(`SNM's server is now online on port ${port}.`);
});