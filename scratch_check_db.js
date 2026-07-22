const mongoose = require("mongoose");
const dns = require("dns");

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const uri = "mongodb+srv://allurite:Youssef2005@cluster0.hb6akdj.mongodb.net/allurite?retryWrites=true&w=majority&appName=Cluster0";

async function checkFollowUps() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB!");

    const FollowUp = mongoose.model("FollowUp", new mongoose.Schema({}, { strict: false }), "followups");
    const Client = mongoose.model("Client", new mongoose.Schema({}, { strict: false }), "clients");
    const Task = mongoose.model("Task", new mongoose.Schema({}, { strict: false }), "tasks");

    const totalFollowUps = await FollowUp.countDocuments({});
    console.log("Total FollowUps in DB:", totalFollowUps);

    const sampleFollowUps = await FollowUp.find({}).limit(5);
    console.log("Sample FollowUps:", JSON.stringify(sampleFollowUps, null, 2));

    const totalClients = await Client.countDocuments({});
    console.log("Total Clients in DB:", totalClients);

    const totalTasks = await Task.countDocuments({});
    console.log("Total Tasks in DB:", totalTasks);

    await mongoose.disconnect();
  } catch (err) {
    console.error("DB check error:", err);
  }
}

checkFollowUps();
