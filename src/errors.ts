export class HttpError extends Error {
    public readonly code: number;

    constructor(message: string, code: number) {
        super(message);

        this.code = code;
    }
}

export class BadRequestError extends HttpError {
    constructor(message: string) {
        super(message, 400);
    }
}

export class UnauthorizedError extends HttpError {
    constructor(message: string) {
        super(message, 401);
    }
}

export class ForbiddenError extends HttpError {
    constructor(message: string) {
        super(message, 403);
    }
}

export class NotFoundError extends HttpError {
    constructor(message: string) {
        super(message, 404);
    }
}

export class TooManyRequestsError extends HttpError {
    constructor(message: string) {
        super(message, 429);
    }
}
