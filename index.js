const express = require("express");
const hookRouter = require("./routes/hookRoutes.js");
const app = express();

app.use(express.json());

app.use('/webhooks', hookRouter)

// main
;(async () => {
    try {

        const port = process.env.PORT || 3000
        app.listen(port, () => console.log(`Server started on port ${port}`));

    } catch (err) {
        console.error(err);
    }
})();