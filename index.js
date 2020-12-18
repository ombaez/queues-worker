const PORT_NUMBER = 8080;
const Consumer = require("sqs-consumer");
const AWS = require("aws-sdk");
const { handlerWrapper } = require("./handler.utils");
const { promisify } = require("util");
require("dotenv").config();

const sns = new AWS.SNS({
  endpoint: "http://localhost:4575",
  apiVersion: "2010-03-31",
  region: `${process.env.AWS_REGION}`,
});

sns.publish = promisify(sns.publish);

const create = (consumerName, queueName, controllerMethod) => {
  const consumer = Consumer.create({
    queueUrl: `http://localhost:4576/queue/${queueName}`,
    messageAttributeNames: ["All"],
    sqs: new AWS.SQS({
      endpoint: "http://localhost:4576",
      apiVersion: "2012-11-05",
      region: `${process.env.AWS_REGION}`,
    }),
    handleMessage: handlerWrapper(controllerMethod, consumerName),
  });

  consumer.on("error", (err) => {
    console.error(`Error on ${consumerName}: ${err.message}`);
  });

  consumer.on("processing_error", (err) => {
    console.error(`Error on ${consumerName}: ${err.message}`);
  });

  return consumer;
};

const processNotifications = async (data) => {
  console.log("[processNotifications] - read: %j", data);

  let message = "";
  if (data.event == "login") {
    message = `User ${data.userId} with user name ${data.userName}. Info: ${data.info}`;
  } else {
    message = `User with email ${data.email} with user name ${data.userName}. Info: ${data.info}`;
  }

  // Inserte numero de telefono
  // data.phoneNumber = "+54911XXXXXXXX";
  if (!data.phoneNumber || data.phoneNumber == "") {
    return {
      code: 404,
      msg: "invalid phoneNumber: " + data.phoneNumber,
    };
  }

  const params = {
    Message: message,
    PhoneNumber: data.phoneNumber,
  };

  let result;

  try {
    await new Promise(async (resolve, reject) => {
      try {
        result = await sns.publish(params);
        console.log("sns response: ", JSON.stringify(result));
        //save to dynamodb retry table and header
        resolve();
      } catch (error) {
        console.log(`error on sns, detail:${error}`);
        //save a to dynamodb retry table and header
        reject("failed sending thru sns");
      }
    });
  } catch (error) {
    return {
      code: 500,
      msg: error,
    };
  }

  const resp = {
    code: 200,
    msg: "notification delivered successfully",
  };
  return resp;
};

// Get consumers
const notificationsConsumer = create(
  "notificationConsumer",
  "notificaciones",
  processNotifications
);

// Start Consumers
notificationsConsumer.start();
