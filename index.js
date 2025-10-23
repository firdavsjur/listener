import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import input from "input";
import dotenv from "dotenv";
dotenv.config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession(process.env.STRING_SESSION);
const keywords = process.env.KEYWORDS.split(",");
const targetUserId = process.env.TARGET_USER_ID;
const targetUserCloneId = process.env.TARGET_USER_CLONE_ID;

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

      if (keywords.some((k) => text.includes(k.toLowerCase()))) {
        console.log(`🔍 Keyword found in: ${message.chat?.title || "Unknown Channel"}`);
        await client.forwardMessages(targetUserCloneId, {
            messages: [message.id],
            fromPeer: message.chatId,
        });
        await client.forwardMessages(targetUserId, {
            messages: [message.id],
            fromPeer: message.chatId,
        });
      }
    } catch (err) {
      console.error("Error processing update:", err);
    }
  }, new NewMessage({})); 

  process.stdin.resume();
})();
