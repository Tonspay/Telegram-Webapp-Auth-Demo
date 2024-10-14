const fs = require("fs");
const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const crypto = require("crypto");
const nacl = require("tweetnacl")

const b58 = require("b58")

dotenv.config();

const {TELEGRAM_BOT_TOKEN , SIGNKP } = process.env;

const signKp = nacl.sign.keyPair.fromSecretKey(
    b58.decode(
        SIGNKP
    )
)

const app = express();

let fakeRedis = {}

app.get("/", (req, res) =>  res.send({
    "code":200,
    "data":"pong"
})
);

app.get("/head", (req, res) => {
    let htmlContent = `
    <!DOCTYPE HTML>
    <html lang="en">
    
    <head>
    
        <title>Webapp Auth</title>
    
        <meta id="theme-check" name="theme-color" content="#FFFFFF">
    
        <body onload="init()">
    
            <div id='content'>
    
            </div>
            <!-- Telegram -->
            <script src="https://bundle.run/buffer@6.0.3"></script>
            <script type="text/javascript">
              window.Buffer = window.Buffer ?? buffer.Buffer;
            </script>
            <script src="https://telegram.org/js/telegram-web-app.js"></script>
            <script src="https://unpkg.com/@tonconnect/sdk@latest/dist/tonconnect-sdk.min.js"></script>
            <script>
                
                async function miniapp_init() {
                    await Telegram.WebApp.ready();
                    if (window.Telegram.WebApp.initData) {
                        return window.Telegram.WebApp.initData
                    }
                    return false
                }
    
  
  
                async function init()
                {
                    const data = await miniapp_init()
                    console.log(
                        data
                    )
                    const bs64 = Buffer.from(data).toString("base64")
                    const redirect =  location.origin + '/api/auth?auth='+bs64+"&tgWebAppStartParam="+window.Telegram.WebApp.initDataUnsafe.start_param
                    location.href = redirect
    
                }
  
            </script>
        </body>
    </head>
    
    </html>
    `;
  
    res.send(htmlContent);
  });
  app.get("/auth", async (req, res) => {
  
    const rawData = Buffer.from(req.query.auth,"base64").toString("utf-8")
  
    const data = Object.fromEntries(new URLSearchParams( rawData ));
  
    const udata = JSON.parse(data.user)
  
    data['user']=udata
  
    verify = tgVerfiy(TELEGRAM_BOT_TOKEN,rawData)
    if(verify)
    {
      console.log(udata)
      const final = {
        data:req.query.tgWebAppStartParam,
        user:{
            id:udata.id,
            username:udata.username
        }
      }
      console.log(
        {
            raw:final,
            sign:signMessage(
                {
                    final
                }
            )
        }
      )
      let htmlContent = `
      <!DOCTYPE HTML>
      <html lang="en">
      
      <head>
      
          <title>Webapp Auth</title>
      
          <meta id="theme-check" name="theme-color" content="#FFFFFF">
      
          <body onload="init()">
      
              <div id='content'>
      
              </div>
              <!-- Telegram -->
              <script src="https://bundle.run/buffer@6.0.3"></script>
              <script type="text/javascript">
                window.Buffer = window.Buffer ?? buffer.Buffer;
              </script>
              <script src="https://telegram.org/js/telegram-web-app.js"></script>
              <script src="https://unpkg.com/@tonconnect/sdk@latest/dist/tonconnect-sdk.min.js"></script>
              <script>
                  
                  async function miniapp_init() {
                      await Telegram.WebApp.ready();
                      if (window.Telegram.WebApp.initData) {
                          return window.Telegram.WebApp.initData
                      }
                      return false
                  }
      
    
    
                  async function init()
                  {
                      const data = await miniapp_init()
                      await Telegram.WebApp.close()
                  }
    
              </script>
          </body>
      </head>
      
      </html>
      `

    res.send(htmlContent);

    fakeRedis[req.query.tgWebAppStartParam] = {
        raw:final,
        sign:signMessage(
            {
                final
            }
        )
    }
    setTimeout(() => {
        fakeRedis.delete(req.query.tgWebAppStartParam)
    }, 36000);
    }else{
      res.status(200).send({
        "code": 200,
        "data": "lol"
    })
    }
})

app.get("/result/:data", async (req, res) => {
    let key = req.params.data;
    if(fakeRedis[key])
    {
        res.send({
            "code":200,
            "data":fakeRedis[key]
        })
    }
    res.send({
        "code":500,
        "data":"failed"
    })
});

function tgVerfiy(apiToken, telegramInitData) {

  const initData = new URLSearchParams(telegramInitData);
  
  initData.sort();

  const hash = initData.get("hash");
  initData.delete("hash");

  const dataToCheck = [...initData.entries()].map(([key, value]) => key + "=" + value).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(apiToken).digest();

  const _hash = crypto.createHmac("sha256", secretKey).update(dataToCheck).digest("hex");

  return hash === _hash;
}

function signMessage(data)
{
    return b58.encode(
        nacl.sign(
            Buffer.from(JSON.stringify(data))
            ,signKp.secretKey
            )
    )
}

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;