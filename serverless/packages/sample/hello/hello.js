const { Client } = require('@notionhq/client');
const mongoose = require('mongoose');
const axios  = require('axios');
require('dotenv').config()

const notion = new Client({
    auth: process.env.NOTION_TOKEN, // Set your integration token as an environment variable
});

const ItemSchema = new mongoose.Schema({
    name: { type: String, required: true, index: true }, // Indexed for quicker search
    slug: { type: String, required: true, index: true }, // Indexed for quicker search
    collectionId: { type: String, required: true },
    itemId: { type: String, required: true }
});


// Define the schema
const pageSchema = new mongoose.Schema({
  pageId: {
      type: String,
      required: true,
      unique: true, // Ensures index is unique
      index: true   // Makes this property indexable
  },
  lastUpdated: {
      type: Date,
      required: true
  }
});

const Page = mongoose.model('Page', pageSchema);
const Item = mongoose.model('Item', ItemSchema);


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

async function processNotionContent(pageId) {
  const response = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 50,
  });
  const pageData = extractContent(response.results);
  const htmlData = convertToHTML(pageData);
  if (!htmlData) {
      throw new Error('HTML conversion failed');
  }
  return htmlData;
}

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

const connectToDatabase = async () => {
  if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.DATABASE_URL, {
          useNewUrlParser: true,
          useUnifiedTopology: true
      });
  }
};

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
  }
};

const addOrUpdateItem = async (name, slug, collectionId, itemId) => {
  await connectToDatabase();
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

async function createPage(pageId, lastUpdated) {

  await connectToDatabase();
  try {
      const newPage = new Page({
          pageId: pageId,
          lastUpdated: lastUpdated
      });
      await newPage.save();
      console.log('Page saved successfully:', newPage);
  } catch (error) {
      console.error('Error saving the page:', error);
  }finally {
      await mongoose.disconnect(); // Optionally disconnect if not in serverless
    }
}

async function updateLastUpdated(pageId, newLastUpdated) {
  await connectToDatabase();
  try {
      const result = await Page.findOneAndUpdate(
          { pageId: pageId },
          { lastUpdated: newLastUpdated },
          { new: true }  // Returns the updated object
      );
      if (result) {
          console.log('Updated page lastUpdated time successfully:', result);
      } else {
          console.log('No document found with that pageId.');
      }
  } catch (error) {
      console.error('Error updating lastUpdated time:', error);
  }finally {
      await mongoose.disconnect(); // Optionally disconnect if not in serverless
    }
}

async function getItem(pageTitle,slug){

  await connectToDatabase();
     
  try{
      const item = await Item.findOne({ name: pageTitle, slug: slug });
      return item;
  }catch(error){
      console.error('Error updating lastUpdated time:', error);
  }finally{
      await disconnectDatabase()
  }

}

async function findItemInDB(pageId){
  await connectToDatabase();
     
  try{
    let dbPage = await Page.findOne({ pageId: pageId });
    return dbPage
  }catch(error){
      console.error('Error updating lastUpdated time:', error);
  }finally{
      await disconnectDatabase()
  }

}
/**Webflow function start here */

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

/**Webflow function ends here */

async function manageDatabaseItems(pageTitle, slug,htmlData) {

  await connectToDatabase();
  try {
      let item = await Item.findOne({ name: pageTitle, slug: slug });
      if (!item) {
          const itemData = await createCollectionItem("6613d5ab30544bc293e55431",{name:pageTitle,slug:slug,data:null})
          console.log("Item crated : ",itemData)
          if(itemData){
              item = await addOrUpdateItem(pageTitle, slug, "6613d5ab30544bc293e55431", itemData.id);
          }
        }
        console.log("Item Id : ",item.itemId)
          try {
            await updateWebflowItem('6613d5ab30544bc293e55431', item.itemId, htmlData, pageTitle, slug);
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message:"Data Updated Successfully"})
          };
          } catch (error) {
            console.error("Webflow update failed:", error);
            return {
              statusCode: 400,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: "Webflow update failed", error: error.toString() })
          };
      }
  } catch(error){

      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Webflow update failed", error: error.toString() })
    };
  }finally {
      await disconnectDatabase();
  }
}

async function updatepageData(pageId){
  
  if(!pageId){
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Page Id is invalid" })
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
      const htmlData = await processNotionContent(pageId);

      if (!htmlData) {
          throw new Error('HTML conversion failed');
      }
      console.log(htmlData)
      
      /**update the webflow */
      const data = await manageDatabaseItems(pageTitle,slug,htmlData)
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: JSON.stringify(data) })
    };
} catch (error) {
  console.error("Notion or HTML processing error:", error);
  return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: "Notion or HTML processing error", details: error.message })
  };
}
}
exports.main = async function(event,context) {

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

  const updatedPages = [];

  try {
      // Fetch all pages from the Notion database
      const response = await notion.databases.query({
          database_id: process.env.NOTION_DATABASE
      });

      // Iterate over each page from Notion
      for (let page of response.results) {
          const pageId = page.id;
          console.log("PageId : ",pageId)
          const lastEditedTime = new Date(page.last_edited_time);

          // Check if the page exists in the MongoDB
          let dbPage = await findItemInDB(pageId)

          if (!dbPage) {
              // If the page does not exist, create it
              await createPage(pageId, lastEditedTime);
              updatedPages.push(pageId);
          } else {
              // If the page exists, compare the last updated times
              if (dbPage.lastUpdated < lastEditedTime) {
                  // If the fetched last updated time is newer, update the database
                  await updateLastUpdated(pageId, lastEditedTime);
                  updatedPages.push(pageId);
              }
              // If times are the same, do nothing
          }
      }
      console.log('Updated Pages:', updatedPages);

      if (updatedPages.length > 0) {
        for (const pageId of updatedPages) {
          await updatepageData(pageId);
       }  
        console.log('Updated pages sent to serverless function.');
    } else {
        console.log('No updates to send.');
    }
  } catch (error) {
      console.error('Error in main function:', error);
  }
  

};


