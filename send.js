require("dotenv").config();

const send = async (text, chat_id, topicId, details) => {
  const datas = {
        chat_id,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      };

      if (topicId) {
        datas.message_thread_id = topicId;
      };

    const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
       method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datas)
    });
  const data = await response.json();
  if (!response.ok){
    console.error(`[${details.name}] [${details.id}] 📛 Error sending message:`, data.description || error.message);
    return;
  }
  console.log(`[${details.name}] [${details.id}] ✅ Update Sent Successfully!`);
  return true;
};

module.exports = { send };