require("dotenv").config();

const send = async (content, topicId) => {
    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
       method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: process.env.GROUP_ID,
        message_thread_id: topicId || undefined,
        text: content,
        parse_mode: "HTML"
      })
    });
  const data = await response.json();
  if (!response.ok){
    console.error("Error sending message:", data.description || error.message);
    return;
  }
  console.log("✅ Update sent to group successfully.");
  return true;
};

module.exports = { send };