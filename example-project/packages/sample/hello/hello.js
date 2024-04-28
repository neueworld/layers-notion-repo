const axios = require('axios');
const { Client } = require('@notionhq/client');
const mongoose = require('mongoose');
const Item = require('./schema'); // Assuming the schema file is named CollectionItemModel.js

require('dotenv').config()

const notion = new Client({
    auth: process.env.NOTION_TOKEN, // Set your integration token as an environment variable
});

function extractContent(blocks) {
    return blocks.map(block => {
      switch (block.type) {
        case 'paragraph':
          return { type: 'paragraph', text: block.paragraph.rich_text.map(text => text.plain_text).join('') };
        case 'image':
          return { type: 'image', url: block.image.file ? block.image.file.url : block.image.external.url };
        case 'heading_1':
          return { type: 'heading_1', text: block.heading_1.rich_text.map(text => text.plain_text).join('') };
        case 'heading_2':
          return { type: 'heading_2', text: block.heading_2.rich_text.map(text => text.plain_text).join('') };
        case 'heading_3':
          return { type: 'heading_3', text: block.heading_3.rich_text.map(text => text.plain_text).join('') };
        default:
          return undefined;
      }
    }).filter(content => content !== undefined);
  }
  
function convertToHTML(data) {
    let htmlContent = "";
  
    data.forEach(item => {
      switch (item.type) {
        case 'paragraph':
          htmlContent += `<p>${item.text}</p>\n`;
          break;
        case 'image':
          htmlContent += `<img src="${item.url}" alt="Image">\n`;
          break;
        case 'heading_1':
          htmlContent += `<h1>${item.text}</h1>\n`;
          break;
        case 'heading_2':
          htmlContent += `<h2>${item.text}</h2>\n`;
          break;
        case 'heading_3':
          htmlContent += `<h3>${item.text}</h3>\n`;
          break;
      }
    });
  
    return htmlContent;
  }
  

async function updateWebflowItem(collectionId, itemId, richTextContent, itemName, slug) {
  const options = {
    method: 'PATCH',
    url: `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}`,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` // Use your Webflow API token
    },
    data: {
      isArchived: false,
      isDraft: false,
      fieldData: {
        name: itemName,
        slug: slug,
        data: richTextContent
      }
    }
  };

  try {
    //await publishCollectionItem(collectionId, [itemId])
    const response = await axios.request(options);
    console.log('Item updated successfully:', response.data);
    return response.data; // Return the full response data for more insight if needed

    //return true
  } catch (error) {
    console.error('Error updating item in Webflow:', error.response ? error.response.data : error.message);
    throw new Error(`Failed to update item in Webflow: ${error.message}`);  // Throws an error to be caught by the caller
  
  }
}

const createCollectionItem = async (collectionId,fieldData) => {
  const options = {
    method: 'POST',
    url: `https://api.webflow.com/v2/collections/${collectionId}/items/`,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}` // Replace with your Webflow API token
    },
    data: {
      isArchived: false,
      isDraft: false,
      fieldData: fieldData
    }
  };

  try {
    const response = await axios.request(options);
    return response.data;
  } catch (error) {
    console.error(error);
    throw error;
  }
};  
async function getPageTitle(pageId) {
    try {
      // Fetch the page object based on the page ID
      const response = await notion.pages.retrieve({ page_id: pageId });

      // Corrected to use 'Name' property as per your Notion API structure
      const titleProperty = response.properties.Name;

      if (titleProperty && titleProperty.type === 'title' && titleProperty.title.length > 0) {
        // Retrieve the plain text of the title
        return titleProperty.title[0].plain_text;
      } else {
        // Handle pages that might not have a title or have different structure
        return 'No title found or different structure';
      }
    } catch (error) {
      console.error('Error retrieving page title:', error);
      return null;
    }
}

async function findItemByNameAndSlug(name, slug) {
  try {
      const item = await Item.findOne({ name: name, slug: slug }, 'collectionId itemId');
      if (item) {
          return { collectionId: item.collectionId, itemId: item.itemId };
      } else {
          return null;
      }
  } catch (error) {
      console.error('Error finding item:', error);
      throw error;
  }
}

const addOrUpdateItem = async (name, slug, collectionId, itemId) => {
  //await connectToDatabase();

  try {
    const result = await Item.findOneAndUpdate(
      { itemId: itemId }, // Find an item by itemId
      { name, slug, collectionId, itemId }, // Update these fields
      { new: true, upsert: true, runValidators: true } // Options: create if not exists, return new item
    );

    console.log("Item added or updated:", result);
    return result;
  } catch (error) {
    console.error("Failed to add or update item:", error);
    throw error;  // Rethrow or handle error as needed
  } finally {
    await mongoose.disconnect(); // Optionally disconnect if not in serverless
  }
};

const connectToDatabase = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  return mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true, useUnifiedTopology: true });
};


const disconnectDatabase = async () => {
  await mongoose.disconnect();
};


exports.main = async function(event, context) {

    /**connect with mongoDB */
    await connectToDatabase()

    // Decode the Base64 encoded body
    const decodedBody = Buffer.from(event.__ow_body, 'base64').toString('utf-8');
    let parsedBody;
    let pageId;

    try {
      parsedBody = JSON.parse(decodedBody);
      pageId = parsedBody.pageId
    } catch (e) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Failed to parse JSON from body" })
        };
      }

    const pageTitle = await getPageTitle(pageId)
    console.log("pageTitle : ",pageTitle)
    const slug = pageTitle.toLowerCase().replace(/\s+/g, '-');

    if (!pageTitle || !slug) {
      return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: "Page title or slug is missing or invalid" })
      };
    }

   try {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 50,
        });
        const pageData = extractContent(response.results);
        const htmlData = convertToHTML(pageData);
        if (!htmlData) {
            throw new Error('HTML conversion failed');
        }


        let item;

        try {
          item = await Item.findOne({ name: pageTitle, slug: slug });
          if (!item) {
            /**Create the item in default collection in webflow */
            const itemData = await createCollectionItem("6613d5ab30544bc293e55431",{name:pageTitle,slug:slug,data:null})
            if(itemData){
              /**Warning PageTitle shouldn't be null, or undefined*/
              item = await addOrUpdateItem(pageTitle,slug,"6613d5ab30544bc293e55431",itemData.id)
              console.log("New item inserted in DB")
            }
            }
          } catch (error) {
            console.error("Database operation failed", error);
            return {
              statusCode: 500,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: "Internal Server Error", details: error.message })
            };
          }finally{
            await disconnectDatabase();
          }      

          console.log("item data again :",item.itemId) 
          try {
            const webflow_update = await updateWebflowItem('6613d5ab30544bc293e55431', item.itemId, htmlData, pageTitle, slug);
            console.log("Webflow update successful", webflow_update);
        } catch (error) {
            console.error("Webflow update failed:", error);
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "Webflow update failed", error: error.toString() })
            };
        }
        

      // await appendToNotionPage(parsedBody.pageId,"This content is pushed by serverless function")
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message:"Data Updated Successfully"})
        };

 } catch (error) {
    console.error("Notion or HTML processing error:", error);
    return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Notion or HTML processing error", details: error.message })
    };
}

        /**
         * Fetch the collection and check whether the item exist in any collection or not
         * If item exist, fetch the collection and Item id and update data
         * If doesn't exist, Create new item and push the data.
         */
    
};









// async function appendToNotionPage(pageId, content) {
//     try {
//         const blockId = pageId; // In Notion, Page ID and Block ID are often the same for top-level page blocks
//         const response = await notion.blocks.children.append({
//             block_id: blockId,
//             children: [
//                 {
//                     object: 'block',
//                     type: 'paragraph',
//                     paragraph: {
//                         rich_text: [ // Corrected from 'text' to 'rich_text'
//                             {
//                                 type: 'text',
//                                 text: {
//                                     content: content,
//                                     link: null
//                                 }
//                             }
//                         ]
//                     }
//                 }
//             ]
//         });
//         console.log("Block appended:", response);
//         return response;
//     } catch (error) {
//         console.error("Error appending to Notion page:", error);
//         return null;
//     }
// }

