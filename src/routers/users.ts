import express, {
    Request,
    Response
} from "express";

import z from "zod";

import validateWithSchema from "./middlewares/validateWithSchema";

const router = express.Router();

router.post(
    "/",
    validateWithSchema(z.object({
        email: z.string().email(),
        username: z.string().regex(/^(?=.{8,20}$)(?![_.])(?!.*[_.]{2})[a-zA-Z0-9._]+(?<![_.])$/),
        password: z.string().regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/)
    })),
    (req: Request, res: Response) => {

    }
);

export default router;
