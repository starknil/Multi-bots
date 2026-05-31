require("dotenv").config();
const { MongoClient } = require("mongodb");
let db, ta, da;

const connectDb = async () => {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db("multi-self-bots");
    ta = db.collection("telegram-apps");
    da = db.collection("discord-apps");
  } catch (error) {
    throw new Error("📛 Failed to connect to MongoDB:" + error.message);
  }
};


const createApp = async (platform, appData) => {
  try {
    if (platform === "telegram") {
      const result = await ta.insertOne(appData);
      return result.insertedId;
    } else if (platform === "discord") {
      const result = await da.insertOne(appData);
      return result.insertedId;
    } else {
      throw new Error("Invalid platform specified");
    };
  } catch (error) {
    throw new Error("📛 Failed to create app in MongoDB:" + error.message);
  };
};


const getApp = async (platform, tokenOrPhone, id) => {
  try {
    let query = {};

    if (platform === "telegram") {
      query = {
        $or: [
          { phoneNumber: tokenOrPhone },
          { id },
        ],
      };
      return await ta.findOne(query);
    }

    if (platform === "discord") {
      query = {
        $or: [
          { token: tokenOrPhone },
          { id },
        ],
      };
      return await da.findOne(query);
    }

    throw new Error("Invalid platform specified");
  } catch (error) {
    throw new Error("📛 Failed to fetch app from MongoDB: " + error.message);
  }
};


const getApps = async (platform) => {
  try {
    if (platform === "telegram") {
      return await ta.find({}).toArray();
    } else if (platform === "discord") {
      return await da.find({}).toArray();
    } else {
      throw new Error("Invalid platform specified");
    };
  } catch (error) {
    throw new Error("📛 Failed to fetch apps from MongoDB:" + error.message);
  };
};



const updateApp = async (platform, id, session) => {
  try {
    const collection =
      platform === "telegram"
        ? ta
        : platform === "discord"
          ? da
          : null;

    if (!collection) {
      throw new Error("Invalid platform specified");
    }

    return await collection.updateOne(
      { id },
      {
        $set: { session },
      },
    );
  } catch (error) {
    throw new Error("📛 Failed to update app: " + error.message);
  }
};


const deleteApp = async (platform, id) => {
  try {
    if (platform === "telegram") {
      return await ta.deleteOne({
        id
      });
    } else if (platform === "discord") {
      return await da.deleteOne({
        id
      });
    } else {
      throw new Error("Invalid platform specified");
    };
  } catch (error) {
    throw new Error("📛 Failed to delete apps from MongoDB:" + error.message);
  };
};

module.exports = {
  connectDb,
  createApp,
  getApp,
  getApps,
  updateApp,
  deleteApp
};