import re
import asyncio
from telethon import TelegramClient, events
from telethon.sessions import StringSession

API_ID = 1234567
API_HASH = "your_api_hash_here"
SESSION_NAME = "tele_forwarder"
TARGET = "target_username_or_id"

keywords = ["urgent", "discount", "error", "giveaway"]
USE_REGEX = False
CASE_INSENSITIVE = True
FORWARD_ORIGINAL = True
MIN_FORWARD_INTERVAL = 0.5

if USE_REGEX:
    flags = re.IGNORECASE if CASE_INSENSITIVE else 0
    patterns = [re.compile(k, flags) for k in keywords]
else:
    if CASE_INSENSITIVE:
        keywords = [k.lower() for k in keywords]

# ✅ declare as global
last_forward_time = 0.0


async def main():
    global last_forward_time  # <-- changed from nonlocal to global

    client = TelegramClient(SESSION_NAME, API_ID, API_HASH)
    await client.start()
    print("Logged in. Listening for messages...")

    @client.on(events.NewMessage(incoming=True))
    async def handler(event):
        global last_forward_time  # also here for safety

        if not event.message:
            return
        if not event.is_channel:
            return

        text = event.message.message or ""
        text_to_check = text.lower() if CASE_INSENSITIVE else text

        matched = False
        if USE_REGEX:
            matched = any(p.search(text_to_check) for p in patterns)
        else:
            matched = any(k in text_to_check for k in keywords)

        if not matched:
            return

        import time
        now = time.time()
        if now - last_forward_time < MIN_FORWARD_INTERVAL:
            await asyncio.sleep(MIN_FORWARD_INTERVAL)
        last_forward_time = time.time()

        target_entity = int(TARGET) if TARGET.isdigit() else TARGET

        if FORWARD_ORIGINAL:
            await client.forward_messages(target_entity, event.message)
        else:
            chat = await event.get_chat()
            title = getattr(chat, 'title', None) or getattr(chat, 'username', None) or str(chat.id)
            text_preview = (text[:400] + "...") if len(text) > 400 else text
            await client.send_message(
                target_entity, f"Match in {title}:\n\n{text_preview}"
            )

        print(f"Forwarded from {event.chat_id} → {TARGET}")

    await client.run_until_disconnected()


if __name__ == "__main__":
    asyncio.run(main())
