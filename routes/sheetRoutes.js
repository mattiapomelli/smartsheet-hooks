const express = require('express')
const sheetRouter = express.Router()
const { initSmartsheet } = require('../smartsheet')
const smartsheet = initSmartsheet()

sheetRouter.get('/', async (req, res) => {
    var options = {
        queryParameters: {
          	include: "attachments",
          	includeAll: true
        }
      };
    const sheets = await smartsheet.sheets.listSheets(options)
    res.json(sheets)
})

module.exports = sheetRouter