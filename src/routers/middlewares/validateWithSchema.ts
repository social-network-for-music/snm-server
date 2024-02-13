import { 
    NextFunction,
    Request,
    Response
} from "express";

import z, { ZodError } from "zod";

export interface IOptions {
    params?: z.ZodType<any>;
    query?: z.ZodType<any>;
    body?: z.ZodType<any>;
}

export default function(options: IOptions): (req: Request, res: Response, next: NextFunction) => Promise<void> {
    return async (req: Request, _: Response, next: NextFunction): Promise<void> => {
        try {
            for (let key of ["params", "query", "body"])
                await options[key as keyof IOptions]
                    ?.parseAsync(req[key as keyof Request]);

            next();
        } catch (error) {
            if (error instanceof ZodError)
                next(error);
        }
    };
}