const client = require('smartsheet');
const { smartSheetAccessToken } = require('./config')

let smartsheet;

// initializes and returns smartsheet client, or returns the existing one if already created
function initializeSmartsheetClient(token) {
    //if(smartsheet) {
    //    return smartsheet
    //}
    smartsheet = client.createClient({
        accessToken: token,
    });

    return smartsheet
}

// check for an existing web hook with the name and targetsheet provided, if doesn't find it creates a new one
async function initializeHook(targetSheetId, hookName, callbackUrl) {
    try {
        let webhook = null;
        // Get all my hooks
        const smartsheet = await initializeSmartsheetClient(smartSheetAccessToken)

        const listHooksResponse = await smartsheet.webhooks.listWebhooks({
            includeAll: true
        });
        console.log(`Found ${listHooksResponse.totalCount} hooks owned by user`);

        // Check for existing hooks on this sheet for this app
        for (const hook of listHooksResponse.data) {
            if (hook.scopeObjectId.toString() === targetSheetId.toString()
                && hook.name === hookName
                && hook.callbackUrl === callbackUrl
            ) {
                webhook = hook;
                console.log(`Found matching hook with id: ${webhook.id}`);
                break;
            }
        }

        // Didn't find any existing hook - create a new one
        if (!webhook) {
            // TODO: make column to track dynamic by passing it to this function
            // get sheet and target column to listen for changes on
            const sheet = await smartsheet.sheets.getSheet({id: targetSheetId})
            const columnToTrack = sheet.columns.find(column => column.title === "POV status")

            // create new webhook with following options
            const options = {
                body: {
                    name: hookName,
                    callbackUrl,
                    scope: "sheet",
                    scopeObjectId: targetSheetId,
                    events: ["*.*"],
                    version: 1,
                    subscope: {
                        columnIds: [columnToTrack.id]       // columns to track
                    }
                }
            };

            const createResponse = await smartsheet.webhooks.createWebhook(options);
            webhook = createResponse.result;

            console.log(`Created new hook: ${webhook.id}`);
        }

        // Make sure webhook is enabled and pointing to our current url
        const options = {
            webhookId: webhook.id,
            callbackUrl: callbackUrl,
            body: { enabled: true }
        };

        const updateResponse = await smartsheet.webhooks.updateWebhook(options);
        const updatedWebhook = updateResponse.result;
        console.log(`Hook enabled: ${updatedWebhook.enabled}, status: ${updatedWebhook.status}`);

        return updatedWebhook
    } catch (err) {
        return err;
    }
}

module.exports = {
    initializeSmartsheetClient,
    initializeHook
}