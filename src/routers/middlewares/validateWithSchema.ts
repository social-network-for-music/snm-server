import { 
    NextFunction,
    Request,
    Response
} from "express";

import z from "zod";

export default function(schema: z.ZodObject<any>): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, _: Response, next: NextFunction): void => {
        schema.parseAsync(req.body)
            .then(_ => next())
            .catch(error => next(error));
    };
}