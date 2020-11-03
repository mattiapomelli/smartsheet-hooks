const express = require('express')
const hookRouter = express.Router()
const { sheetId } = require('../config')
const { initSmartsheet } = require('../smartsheet')
const smartsheet = initSmartsheet()

hookRouter.get('/list', async (req, res) => {
    const listHooksResponse = await smartsheet.webhooks.listWebhooks({
        includeAll: true
    });
    res.json(listHooksResponse)
})

hookRouter.post("/tryhook", async(req, res) => {
    try {
        const body = req.body;

        // Callback could be due to validation, status change, or actual sheet change events
        if (body.challenge) {
            console.log("Received verification callback");
            // Verify we are listening by echoing challenge value
            res.status(200).json({ smartsheetHookResponse: body.challenge });
        } else if (body.events) {
            console.log(`Received event callback with ${body.events.length} events at ${new Date().toLocaleString()}`);

            await processEvents(body);

            res.sendStatus(200);
        } else if (body.newWebHookStatus) {
            console.log(`Received status callback, new status: ${body.newWebHookStatus}`);
            res.sendStatus(200);
        } else {
            console.log(`Received unknown callback: ${body}`);
            res.sendStatus(200);
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(`Error: ${error}`);
    }
})

async function processEvents(callbackData) {
    if (callbackData.scope !== "sheet") {
        return;
    }

    for (const event of callbackData.events) {
        // This sample only considers cell changes
        if (event.objectType === "cell") {
            console.log(`Cell changed, row id: ${event.rowId}, column id ${event.columnId}`);

            // Since event data is "thin", we need to read from the sheet to get updated values.
            const options = {
                id: callbackData.scopeObjectId,                 // Get sheet id from callback
                queryParameters: {
                    rowIds: event.rowId.toString(),             // Read just the row that has been modified (the one that triggered the event)
                    //columnIds: event.columnId.toString()      // read just the column that has been modified
                }
            };
            const response = await smartsheet.sheets.getSheet(options);
            //console.log('res: ', response.rows[0].cells)
            // get the row modified
            const row = response.rows[0];

            const modifiedCell = row.cells.find(cell => cell.columnId === event.columnId)
            const modifiedColumn = response.columns.find(column => column.id === modifiedCell.columnId)
            console.log(` New value "${modifiedCell.value}" in column "${modifiedColumn.title}", row number ${row.rowNumber}`)

            const columnToUpdate = response.columns.find(column => column.title === 'Completato')
            //console.log('column to update: ', columnToUpdate.id, 'row to update: ', row.id)

            if(modifiedColumn.title === 'Stato' && modifiedCell.value === 'Completo') {
                console.log(modifiedCell)
                const options = {
                    sheetId: sheetId,
                    body: [{
                        id: row.id,
                        cells: [
                            {
                                columnId: columnToUpdate.id,
                                value: new Date()
                            }
                        ]
                    }]
                }

                smartsheet.sheets.updateRow(options)
                .then((res) => {
                    console.log(res.message)
                }).catch(err => {
                    console.log('err: ', err)
                })
            }
        }
    }
}

module.exports = hookRouter