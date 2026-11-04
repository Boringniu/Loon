/**
 * Cloudflare Worker - Telegram 传话机器人
 * KV 持久化合并 + Bark推送 + 快捷指令回复
 */

export default {
  async fetch(request, env, ctx) {

    const url = new URL(request.url);

    // ==========================
    // Bark 快捷指令回复接口
    // ==========================
    if (
      request.method === "POST" &&
      url.pathname === "/reply"
    ) {
      try {
        const body = await request.json();

        // 安全验证
        if (
          !body.secret ||
          body.secret !== env.BARK_SECRET
        ) {
          return new Response("Forbidden", {
            status: 403
          });
        }


        const chatId = String(body.chat_id || "");
        const text = body.text || "";


        if (!chatId || !text) {
          return new Response("Missing data", {
            status: 400
          });
        }


        const result = await sendTgMessage(
          env.TG_BOT_TOKEN,
          chatId,
          text
        );


        console.log(
          "快捷回复结果:",
          JSON.stringify(result)
        );


        return new Response("OK");

      } catch (e) {

        console.error(
          "快捷回复错误:",
          e
        );

        return new Response(
          "Error",
          { status:500 }
        );
      }
    }



    // ==========================
    // Telegram Webhook
    // ==========================
    if (request.method !== "POST") {
      return new Response(
        "Worker Running OK",
        { status:200 }
      );
    }


    try {

      const update =
        await request.json();


      if (
        update &&
        update.message
      ) {

        await handleMessage(
          update.message,
          env
        );

      }


    } catch(err){

      console.error(
        "解析失败:",
        err
      );

    }


    return new Response("OK");
  }
};



// ==========================
// 原来的消息处理
// ==========================

async function handleMessage(message, env) {

  const token =
    (env.TG_BOT_TOKEN || "").trim();


  const adminId =
    (env.ADMIN_TG_ID || "").trim();



  let rawBarkKey =
    (env.BARK_KEY || "").trim();



  const barkKey =
    rawBarkKey
      .replace(/^https?:\/\/(api\.)?day\.app\//i,"")
      .replace(/\/.*$/,"")
      .trim();



  const chatId =
    String(message.chat.id);



  const isFromAdmin =
    chatId === adminId;



  const text =
    message.text ||
    "[非文本消息]";



  const senderName =
    message.from.first_name ||
    "用户";



  const senderId =
    message.from.id;



  // 管理员回复
  if(isFromAdmin){

    if(message.reply_to_message){

      const replyText =
        message.reply_to_message.text || "";


      const match =
        replyText.match(
          /\[会话用户 ID:\s*(\d+)\]/
        );


      if(match){

        await sendTgMessage(
          token,
          match[1],
          message.text
        );

      }

    }


    return;
  }



  // 新用户
  if(text === "/start"){

    await sendTgMessage(
      token,
      chatId,
      "私人传讯站已启动🔛请在听到语音🎶哔哩吧啦🎶后留言 🫪🫪🫪"
    );

    return;
  }



  await sendTgMessage(
    token,
    chatId,
    "✅ 消息已经提交给管理员，等待回复。"
  );



  const now =
    new Date();


  const timeStr =
    `${String(
      (now.getUTCHours()+8)%24
    ).padStart(2,"0")}:${String(
      now.getUTCMinutes()
    ).padStart(2,"0")}`;



  const cacheKey =
    `user_${senderId}`;



  const kv =
    env.TG_CACHE;



  let cachedData=null;



  if(kv){

    try{

      const raw =
        await kv.get(cacheKey);


      if(raw){

        cachedData =
          JSON.parse(raw);

      }


    }catch(e){}

  }



  const line =
    `[${timeStr}] ${text}`;



  let finalText="";
  let msgId=null;



  if(
    cachedData &&
    cachedData.msgId &&
    cachedData.text
  ){

    finalText =
      `${cachedData.text}\n${line}`;

    msgId =
      cachedData.msgId;

  }
  else{

    finalText =
`📩 [会话用户 ID: ${senderId}]
👤 来自: ${senderName}
------------------------
${line}`;

  }



  let edited=false;



  if(msgId){

    const r =
      await editTgMessage(
        token,
        adminId,
        msgId,
        finalText
      );


    if(r && r.ok){

      edited=true;

      if(kv){

        await kv.put(
          cacheKey,
          JSON.stringify({
            msgId,
            text:finalText
          }),
          {
            expirationTtl:1800
          }
        );

      }

    }

  }



  if(!edited){

    const r =
      await sendTgMessage(
        token,
        adminId,
        finalText
      );


    if(
      r &&
      r.ok &&
      r.result &&
      kv
    ){

      await kv.put(
        cacheKey,
        JSON.stringify({
          msgId:r.result.message_id,
          text:finalText
        }),
        {
          expirationTtl:1800
        }
      );

    }

  }



  // Bark通知
  if(barkKey){

    const clickUrl =
`shortcuts://run-shortcut?name=${encodeURIComponent("Bark回复")}&input=text&text=${senderId}`;


    await fetch(
      "https://api.day.app/push",
      {
        method:"POST",
        headers:{
          "Content-Type":
          "application/json"
        },
        body:JSON.stringify({

          device_key:barkKey,

          title:
          `来自 ${senderName} 的消息`,

          body:text,

          group:"TG_Bot",

          url:clickUrl

        })
      }
    );

  }

}



// ==========================
// Telegram API
// ==========================

async function sendTgMessage(
  token,
  chatId,
  text
){

  const res =
    await fetch(
`https://api.telegram.org/bot${token}/sendMessage`,
{
 method:"POST",
 headers:{
 "Content-Type":"application/json"
 },
 body:JSON.stringify({
  chat_id:chatId,
  text:text
 })
});


return await res.json();

}



async function editTgMessage(
 token,
 chatId,
 messageId,
 text
){

 const res =
 await fetch(
`https://api.telegram.org/bot${token}/editMessageText`,
{
 method:"POST",
 headers:{
 "Content-Type":"application/json"
 },
 body:JSON.stringify({
  chat_id:chatId,
  message_id:messageId,
  text:text
 })
});


return await res.json();

}