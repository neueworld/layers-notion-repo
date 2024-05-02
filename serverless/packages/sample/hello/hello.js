const axios = require('axios');
const { Client } = require('@notionhq/client');
const mongoose = require('mongoose');
const { extractContent, convertToHTML } = require('../../../lib/contentUtils');
const { updateWebflowItem, createCollectionItem } = require('../../../lib/webflowUtils');
const { getPageTitle } = require('../../../lib/notionUtils');
const { addOrUpdateItem } = require('../../../lib/databaseUtils');
const { processNotionContent } = require('../../../lib/operations/contentProcessing');
const {getItem } = require('../../../lib/databaseUtils');
const {manageDatabaseItems} = require('../../../lib/operations/databaseOperations')

exports.main = async function(event,context) {


          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messsage: "success" })
          };

    /**connect with mongoDB */
   // await connectToDatabase()

    //Decode the Base64 encoded body

  //   const decodedBody = Buffer.from(event.__ow_body, 'base64').toString('utf-8');
  //   let parsedBody;
  //   let pageId;

  //   try {
  //     parsedBody = JSON.parse(decodedBody);
  //     pageId = parsedBody.pageId
  //   } catch (e) {
  //     return {
  //       statusCode: 400,
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ error: "Failed to parse JSON from body" })
  //       };
  //  }

    // const requestBody = JSON.parse(event.body);
    // const pageId = requestBody.pageId;
  
//     if(!pageId){
//       return {
//         statusCode: 400,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: "Page Id is invalid" })
//     };
//     }
//     const pageTitle = await getPageTitle(pageId)
//     console.log("pageTitle : ",pageTitle)
//     const slug = pageTitle.toLowerCase().replace(/\s+/g, '-');

//     if (!pageTitle || !slug) {
//       return {
//           statusCode: 400,
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ error: "Page title or slug is missing or invalid" })
//       };
//     }
//    try {
//         const htmlData = await processNotionContent(pageId);

//         if (!htmlData) {
//             throw new Error('HTML conversion failed');
//         }
//         console.log(htmlData)
//         /**update the webflow */
//         const data = await manageDatabaseItems(pageTitle,slug,htmlData)
//         console.log("Data : ",data)      

//  } catch (error) {
//     console.error("Notion or HTML processing error:", error);
//     return {
//         statusCode: 500,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ error: "Notion or HTML processing error", details: error.message })
//     };
// }
};


