import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js"; // ✅ this is key
import input from "input";

const apiId = 28474607; // e.g. 123456
const apiHash = "fb2fd725174a48b49bb61f59ad9379fc";
const stringSession = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBuwxrKvDeE3gfL3aWQTyOrPLM1hlQeZhtPXPnAL8vNbHERxpsbkYd16ieVzU/+owMu7pBnPsbif5cvI6jxoeLclMP5WwCppTrtHH0uzuXE6dpJUnv6Vvp3OzP97dg479tIIFFV2SeicO2oowPW+XNWGTQFrkqsHYz8HMDtarNPqUvY8+k7/f2I1Mc1F21b4pv1tzsVm1G1DbICVQKXzhklIPq7OBWMxUZHSEt5hekyHCp01KS5QgEkbpWlmXV/z5Tb5ybu5SdmqgMRzPDmltFxL1tS6KbEWX8WPUUdqFBukMD3Q7pjztFMExfYX/ANt7/ORyl68hxsvg7Z7qgkzDLNtc="); // from login.js
const keywords = ["crypto", "airdrop", "bonus"]; // keywords to search for
const targetUserId = "-4864827696"; // Telegram user ID to forward to

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
        await client.sendMessage(targetUserId, {
          message: `📩 Kalit so'z topildi\n\nManba: @${message.chat?.username || "Unknown Channel"}:\n\nKalit so'z: ${message.message}`,
        });
      }
    } catch (err) {
      console.error("Error processing update:", err);
    }
  }, new NewMessage({})); // ✅ Correct constructor

  process.stdin.resume(); // keep running
})();
