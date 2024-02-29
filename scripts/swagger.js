const swaggerAutogen = require("swagger-autogen")();

swaggerAutogen(
    "../swagger/output.json",
    [ "../src/index.ts" ],
    {
        info: {
            title: "Social Network for Music | API",
            description: "A RESTful API that works as the core of SNM (Social Network for Music)."
        },
        host: "localhost:8080",
        definitions: {
            User: {
                _id: "65a3105e29c6516ab2dd1b38",
                email: "gordon.freeman@hotmail.com",
                username: "gordon.freeman",
                artists: [
                    "59rqdbDiB9oXuZggah1syh",
                    "1dfeR4HaWDbWqFHLkxsg1d",
                    "711MCceyCBcFnzjGY4Q7Un"
                ],
                genres: [
                    "rock"
                ]
            }
        },
        securityDefinitions: {
            JWT: {
                type: "apiKey",
                in: "header",
                name: "authorization",

                description: "Enter the JWT with the 'Bearer ' prefix (e.g. 'Bearer [token]')."
            }
        }
    }
);
