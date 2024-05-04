const axios = require('axios');
//const { Client } = require('@notionhq/client');
const mongoose = require('mongoose')

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

exports.main = async function(event, context) {

    await connectToDatabase()
    await disconnectDatabase()
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message : "success is required here" })
    };
};


