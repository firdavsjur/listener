import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import input from "input";
import dotenv from "dotenv";
import fs from "fs";
import Bottleneck from "bottleneck";
dotenv.config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.STRING_SESSION);
const targetUserId = process.env.TARGET_USER_ID;
const targetUserCloneId = process.env.TARGET_USER_CLONE_ID;
const commanderId = process.env.COMMANDER_ID;

const keywordsFile = "keywords.json";

function loadKeywords() {
  if (!fs.existsSync(keywordsFile)) {
    fs.writeFileSync(keywordsFile, JSON.stringify(["bonus"], null, 2));
  }
  return JSON.parse(fs.readFileSync(keywordsFile));
}

function saveKeywords(list) {
  fs.writeFileSync(keywordsFile, JSON.stringify(list, null, 2));
}

let keywords = loadKeywords().map((k) => k.toLowerCase());

const limiter = new Bottleneck({
  minTime: 5000,
  maxConcurrent: 1
});

async function forwardMessageQueue(client, chatId, messageId) {
  await limiter.schedule(async () => {
    await client.forwardMessages(targetUserCloneId, {
      messages: [messageId],
      fromPeer: chatId,
    });
    await client.forwardMessages(targetUserId, {
      messages: [messageId],
      fromPeer: chatId,
    });
    console.log(`📤 Forwarded post from chat ${chatId}`);
  });
}

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

(async () => {
  console.log("🚀 Connecting...");
  await client.start({
    phoneNumber: async () => await input.text("Enter your phone number: "),
    password: async () => await input.text("Enter your password: "),
    phoneCode: async () => await input.text("Enter the code you received: "),
    onError: (err) => console.error(err),
  });

  console.log("✅ Connected!");
  console.log("👂 Listening for new messages in all joined channels...");

  client.addEventHandler(async (event) => {
    try {
      const message = event.message;
      if (!message || !message.message) return;
      const text = message.message.toLowerCase();

      if (message.senderId?.toString() === commanderId) {
        if (text.startsWith("/add keyword ")) {
          const newKey = text.replace("/add keyword ", "").trim();
          if (!keywords.includes(newKey)) {
            keywords.push(newKey);
            saveKeywords(keywords);
            await client.sendMessage(commanderId, { message: `✅ Keyword added: ${newKey}` });
          } else {
            await client.sendMessage(commanderId, { message: `⚠️ '${newKey}' already exists.` });
          }
          return;
        }

        if (text.startsWith("/remove keyword ")) {
          const delKey = text.replace("/remove keyword ", "").trim();
          keywords = keywords.filter((k) => k !== delKey);
          saveKeywords(keywords);
          await client.sendMessage(commanderId, { message: `🗑️ Removed keyword: ${delKey}` });
          return;
        }

        if (text === "/list keywords") {
          await client.sendMessage(commanderId, {
            message: `📋 Current keywords:\n${keywords.join(", ")}`,
          });
          return;
        }
      }

      if (keywords.some((k) => text.includes(k))) {
        const channelName = message.chat?.title || "Unknown Channel";
        console.log(`🔍 Keyword found in "${channelName}"`);
        await forwardMessageQueue(client, message.chatId, message.id);
      }
    } catch (err) {
      console.error("❌ Error:", err);
    }
  }, new NewMessage({}));

  process.stdin.resume();
})();
