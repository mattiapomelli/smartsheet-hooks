const client = require('smartsheet');
const { smartSheetAccessToken } = require('./config')

let smartsheet;

function initializeSmartsheetClient() {
    if(smartsheet) {
        return smartsheet
    }
    smartsheet = client.createClient({
        accessToken: smartSheetAccessToken,
        logLevel: 'info'
    });
    return smartsheet
}

async function initializeHook(targetSheetId, hookName, callbackUrl) {
    try {
        let webhook = null;

        // Get *all* my hooks
        const listHooksResponse = await smartsheet.webhooks.listWebhooks({
            includeAll: true
        });
        console.log(`Found ${listHooksResponse.totalCount} hooks owned by user`);
        // Check for existing hooks on this sheet for this app
        for (const hook of listHooksResponse.data) {
            if (hook.scopeObjectId.toString() === targetSheetId.toString()
                && hook.name === hookName
                && hook.callbackUrl === callbackUrl   // Might be appropriate for your scenario
            ) {
                webhook = hook;
                console.log(`Found matching hook with id: ${webhook.id}`);
                break;
            }
        }

        if (!webhook) {
            // Can't use any existing hook - create a new one
            const options = {
                body: {
                    name: hookName,
                    callbackUrl,
                    scope: "sheet",
                    scopeObjectId: targetSheetId,
                    events: ["*.*"],
                    version: 1
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
    } catch (err) {
        console.error(err);
    }
}

module.exports = {
    initSmartsheet: initializeSmartsheetClient,
    initializeHook
}