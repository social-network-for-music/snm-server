import { 
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

export default function(schema: z.ZodObject<any>): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, _: Response, next: NextFunction): void => {
        const parsing = schema.safeParse(req.body);

        if (!parsing.success)
            return next(parsing.error);

        return next();
    };
}