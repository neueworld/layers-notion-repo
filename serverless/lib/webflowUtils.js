const axios = require('axios');


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

module.exports = { updateWebflowItem, createCollectionItem };
