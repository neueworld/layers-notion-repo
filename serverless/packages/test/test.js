exports.main = async function(event, context) {


    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message : "success" })
    };
  // let parsedBody;
  // try {
  //   parsedBody = JSON.parse(event.__ow_body);
  //   console.log(parsedBody)
  //   return {
  //     statusCode: 200,
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(`updated pages are ${JSON.stringify(parsedBody)}`)
  //   };
  // } catch (e) {
  //   return {
  //     statusCode: 400,
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ error: "Failed to parse JSON from body" })
  //   };
  // }
  
};


