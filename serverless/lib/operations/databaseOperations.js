const { connectToDatabase, disconnectDatabase, addOrUpdateItem } = require('../databaseUtils');
const {createCollectionItem,updateWebflowItem} = require("../webflowUtils");
const Item = require('../models/Item');

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
        console.log("error : ",error)
    }finally {
        await disconnectDatabase();
    }
}

module.exports = {
    manageDatabaseItems
};
