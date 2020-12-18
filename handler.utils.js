const xid = require('xid-js');

const parseBody = message => {
  let dataJson;

  try {
    dataJson = JSON.parse(message);
  } catch (err) {
    const body = message.replace('\\"', '"');
    dataJson = JSON.parse(body);
    console.log('dataJson: %j', dataJson);
  }

  return dataJson;
};

const handlerWrapper = (functionToCall, consumerName) => {
  return async (message) => {
    const body = message.Body;
    let dataJson;

    const callId = xid.next();
    console.log(`${consumerName} id: %s body: %s`, callId, body);

    try {
      dataJson = parseBody(body);
    } catch (ex) {
      console.error(`${consumerName} Error - id: %s Parsing exception detail: %s`, callId, ex);
      return;
    }

    const result = await functionToCall(dataJson);

    console.log(`${consumerName} - id: %s code: %s result: %s`, 
      callId, 
      result.code, 
      JSON.stringify(result.msg)
    );
  };
};

module.exports = { handlerWrapper };