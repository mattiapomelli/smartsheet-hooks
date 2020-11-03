const dotenv = require('dotenv')
dotenv.config()

module.exports = {
    smartSheetAccessToken: process.env.SMARTSHEET_ACCESS_TOKEN,
    sheetId: process.env.SHEET_ID
}