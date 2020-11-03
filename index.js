const express = require("express");
const hookRouter = require("./routes/hookRoutes.js");
const sheetRouter = require("./routes/sheetRoutes");
const { initializeHook } = require("./smartsheet")
const app = express();

app.use(express.json());

app.use('/sheet', sheetRouter)
app.use('/webhooks', hookRouter)

// main
;(async () => {
    try {

        const port = process.env.PORT || 3000
        app.listen(port, () => console.log(`Server started on port ${port}`));

        await initializeHook(process.env.SHEET_ID, 'tryhook', 'https://205bf7efde55.ngrok.io/webhooks/tryhook'); 

    } catch (err) {
        console.error(err);
    }
})();