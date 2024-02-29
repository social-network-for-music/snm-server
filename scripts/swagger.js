const swaggerAutogen = require("swagger-autogen")();

swaggerAutogen(
    "../swagger/swagger.json",
    [
        "../src/index.ts",
        "../src/routers/*.ts"
    ],
    {
        info: {
            title: "Social Network for Music | API",
            description: "A RESTful API that works as the core of SNM (Social Network for Music)."
        },
        host: "http://localhost:8080/"
    }
);
