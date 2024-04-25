const axios = require('axios');
const { Client } = require('@notionhq/client');
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
      return true
    } catch (error) {
        return false;
    
    }
  }
  
  async function getPageTitle(pageId) {
    try {
      // Fetch the page object based on the page ID
      const response = await notion.pages.retrieve({ page_id: pageId });
      
      // Notion pages can have multiple title properties if there are multiple databases/views.
      // This example assumes there is a single title in the default "title" property of the page.
      const titleProperty = response.properties.title;
      
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
  

async function appendToNotionPage(pageId, content) {
    try {
        const blockId = pageId; // In Notion, Page ID and Block ID are often the same for top-level page blocks
        const response = await notion.blocks.children.append({
            block_id: blockId,
            children: [
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [ // Corrected from 'text' to 'rich_text'
                            {
                                type: 'text',
                                text: {
                                    content: content,
                                    link: null
                                }
                            }
                        ]
                    }
                }
            ]
        });
        console.log("Block appended:", response);
        return response;
    } catch (error) {
        console.error("Error appending to Notion page:", error);
        return null;
    }
}


exports.main = async function(event, context) {


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
        
      const response = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 50,
    });

        console.log(response)

        const pageData = extractContent(response.results);
        console.log(pageData)
        const htmlData = convertToHTML(pageData);

        if (!htmlData) {
        console.log(`HTML conversion failed for page ID ${pageId}`);
        }

        console.log(htmlData)

        
      const webflow_update = await updateWebflowItem('6613d5ab30544bc293e55431', "661ea66da638b95c8b9e75ea", htmlData,"Overview","overview" );
      if(!webflow_update){
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Webflow update failed"})
        };
      }

    //await appendToNotionPage(parsedBody.pageId,"This content is pushed by serverless function")
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Received page ID", pageId: pageId,pageTitle:pageTitle})
    };
};

// async function main(pageId) {


//         console.log("Token : ",process.env.NOTION_TOKEN)
//          const pageTitle = await getPageTitle(pageId)
//          console.log("pageTitle : ",pageTitle)
//          const slug = pageTitle.toLowerCase().replace(/\s+/g, '-');
        
//       const response = await notion.blocks.children.list({
//         block_id: pageId,
//         page_size: 50,
//     });

//         console.log(response)

//         const pageData = extractContent(response.results);
//         console.log(pageData)
//         const htmlData = convertToHTML(pageData);

//         if (!htmlData) {
//         console.log(`HTML conversion failed for page ID ${pageId}`);
//         }

//         console.log(htmlData)

        
//       await updateWebflowItem('6613d5ab30544bc293e55431', "661ea66da638b95c8b9e75ea", htmlData,"Overview","overview" );


//     //await appendToNotionPage(parsedBody.pageId,"This content is pushed by serverless function")
//     return {
//         statusCode: 200,
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ message: "Received page ID", pageId: pageId,pageTitle:pageTitle})
//     };
// };
// //exports.main = main
// main(
//     "c4f87517-def4-4f82-9557-12e4a6b9a2bd"
// )