const express = require('express')
const hookRouter = express.Router()
const { getDifferenceInDays } = require('../utils/utils')
const { initializeSmartsheetClient, initializeHook } = require("../smartsheet")
const { smartSheetAccessToken } = require('../config')

// web hook callback - will be called when an event tracked by the webhook happens
hookRouter.post("/hook/datecompleted", async(req, res) => {
    try {
        const body = req.body;

        // Callback could be due to validation, status change, or actual sheet change events
        if (body.challenge) {
            console.log("Received verification callback");
            // Verify we are listening by echoing challenge value
            res.status(200).json({ smartsheetHookResponse: body.challenge });
        } else if (body.events) {
            // received events
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

// process events received by the webhook and update cells accordingly
async function processEvents(callbackData) {
    if (callbackData.scope !== "sheet") {
        return;
    }

    const smartsheet = await initializeSmartsheetClient(smartSheetAccessToken)

    for (const event of callbackData.events) {
        // if the event was a cell change
        if (event.objectType === "cell") {
            console.log(`Cell changed, row id: ${event.rowId}, column id ${event.columnId}`);

            // read from the sheet to get updated values.
            const options = {
                id: callbackData.scopeObjectId,                 // Get sheet id from callback
                queryParameters: {
                    rowIds: event.rowId.toString(),             // Read just the row that has been modified (the one that triggered the event)
                    //columnIds: event.columnId.toString()      // read just the column that has been modified
                }
            };
            const response = await smartsheet.sheets.getSheet(options);

            // get the row modified
            const row = response.rows[0];

            // get cell and column modified
            const modifiedCell = row.cells.find(cell => cell.columnId === event.columnId)
            const modifiedColumn = response.columns.find(column => column.id === modifiedCell.columnId)
            console.log(`New value "${modifiedCell.value}" in column "${modifiedColumn.title}", row number ${row.rowNumber}`)

            let columnToUpdate
            // if the event happened is the one that should cause an update, get column to update
            if(modifiedColumn.title === 'POV status' && modifiedCell.value === 'completed') {
                columnToUpdate = response.columns.find(column => column.title === 'complete date')
            }
            else if (modifiedColumn.title === 'Converted to PO - booked' && modifiedCell.value !== '') {
                columnToUpdate = response.columns.find(column => column.title === 'booked date')
            }

            if (columnToUpdate !== undefined) {
                // update cells
                const options = {
                    sheetId: callbackData.scopeObjectId,
                    body: [
                        {
                            id: row.id,
                            cells: [
                                {
                                    columnId: columnToUpdate.id,
                                    value: new Date()
                                },
                            ]
                        }
                    ]
                }

                smartsheet.sheets.updateRow(options)
                .then(res => {
                    console.log(res.message)
                }).catch(err => {
                    console.log('err: ', err)
                })
            }
        }
    }
}

// create a new webhook
hookRouter.post("/create", async(req, res) => {
    try {
        const { name, sheetId } = req.body;
        const webhook = await initializeHook(parseInt(sheetId), name, `${process.env.URL}/webhooks/hook/datecompleted`);

        res.json(webhook)
    } catch(err) {
        res.json(err)
    }
})

module.exports = hookRouter