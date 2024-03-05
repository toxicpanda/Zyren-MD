require('./Config')
const pino = require('pino')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const moment = require('moment-timezone');
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./Gallery/lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./Gallery/lib/myfunc')
const { default: MariaConnect, delay, PHONENUMBER_MCC, makeCacheableSignalKeyStore, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, proto, Browsers } = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const Pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const makeWASocket = require("@whiskeysockets/baileys").default

const store = makeInMemoryStore({
    logger: pino().child({
        level: 'silent',
        stream: 'store'
    })
})

let phoneNumber = "919931122319"
let owner = JSON.parse(fs.readFileSync('./Gallery/database/owner.json'))

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))
         
async function startZyren() {
//------------------------------------------------------
let { version, isLatest } = await fetchLatestBaileysVersion()
const {  state, saveCreds } =await useMultiFileAuthState(`./session`)
    const msgRetryCounterCache = new NodeCache() // for retry message, "waiting message"
    const Zyren = makeWASocket({
      logger: pino({ level: 'silent' }),
      printQRInTerminal: !pairingCode, // popping up QR in terminal log
      mobile: useMobile, // mobile api (prone to bans)
      browser: Browsers.ubuntu('Chrome'), // for this issues https://github.com/WhiskeySockets/Baileys/issues/328
      auth: state,
      markOnlineOnConnect: true, // set false for offline
      generateHighQualityLinkPreview: true, // make high preview link
      getMessage: async (key) => {
         let jid = jidNormalizedUser(key.remoteJid)
         let msg = await store.loadMessage(jid, key.id)

         return msg?.message || ""
      },
      msgRetryCounterCache, // Resolve waiting messages
      defaultQueryTimeoutMs: undefined, // for this issues https://github.com/WhiskeySockets/Baileys/issues/276
   })
   
   store.bind(Zyren.ev)

    // login use pairing code
   // source code https://github.com/WhiskeySockets/Baileys/blob/master/Example/example.ts#L61
   if (pairingCode && !Zyren.authState.creds.registered) {
      if (useMobile) throw new Error('Cannot use Pairing code with Mobile API')

      let phoneNumber
      if (!!phoneNumber) {
         phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

         if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
            console.log(chalk.bgBlack(chalk.redBright("Start with Country code of your WhatsApp Number, Example : +94776551215")))
            process.exit(0)
         }
      } else {
         phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Your WhatsApp Bot Number\nFor Example: +94776551215 : `)))
         phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

         // Ask again when entering the wrong number
         if (!Object.keys(PHONENUMBER_MCC).some(v => phoneNumber.startsWith(v))) {
            console.log(chalk.bgBlack(chalk.redBright("Start with Country code of your WhatsApp Number, Example : +947765512156")))

            phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`Your WhatsApp Bot Number Please\nFor Example: +94776551215: `)))
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')
            rl.close()
         }
      }

      setTimeout(async () => {
         let code = await Zyren.requestPairingCode(phoneNumber)
         code = code?.match(/.{1,4}/g)?.join("-") || code
         console.log(chalk.black(chalk.bgGreen(`🤖Here is Your Zyren Pairing Code🤖: `)), chalk.black(chalk.white(code)))
      }, 3000)
   }

    Zyren.ev.on('messages.upsert', async chatUpdate => {
        //console.log(JSON.stringify(chatUpdate, undefined, 2))
        try {
            const mek = chatUpdate.messages[0]
            if (!mek.message) return
            mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast'){
            if (autoread_status) {
            await Zyren.readMessages([mek.key])
            }
            } 
            if (!Zyren.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
            if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
            const m = smsg(Zyren, mek, store)
            require("./Zyren")(Zyren, m, chatUpdate, store)
        } catch (err) {
            console.log(err)
        }
    })

   Zyren.sendContact = async (jid, kon, quoted = '', opts = {}) => {
	let list = []
	for (let i of kon) {
	    list.push({
	    	displayName: await Zyren.getName(i + '@s.whatsapp.net'),
	    	vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await Zyren.getName(i + '@s.whatsapp.net')}\nFN:${await Zyren.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.EMAIL;type=INTERNET:okeae2410@gmail.com\nitem2.X-ABLabel:Email\nitem3.URL:https://instagram.com/cak_haho\nitem3.X-ABLabel:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
	    })
	}
	Zyren.sendMessage(jid, { contacts: { displayName: global.ownername, contacts: list }, ...opts }, { quoted })
    }
    
    Zyren.decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {}
            return decode.user && decode.server && decode.user + '@' + decode.server || jid
        } else return jid
    }

    Zyren.ev.on('contacts.update', update => {
        for (let contact of update) {
            let id = Zyren.decodeJid(contact.id)
            if (store && store.contacts) store.contacts[id] = {
                id,
                name: contact.notify
            }
        }
    })

    Zyren.getName = (jid, withoutContact = false) => {
        id = Zyren.decodeJid(jid)
        withoutContact = Zyren.withoutContact || withoutContact
        let v
        if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
            v = store.contacts[id] || {}
            if (!(v.name || v.subject)) v = Zyren.groupMetadata(id) || {}
            resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
        })
        else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === Zyren.decodeJid(Zyren.user.id) ?
            Zyren.user :
            (store.contacts[id] || {})
        return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
    }
    
    Zyren.public = true

    Zyren.serializeM = (m) => smsg(Zyren, m, store)

Zyren.ev.on("connection.update",async  (s) => {
        const { connection, lastDisconnect } = s
        if (connection == "open") {
console.log(chalk.green('🟨Welcome to Zyren-md'));
console.log(chalk.gray('\n\n🚀Initializing...'));
console.log(chalk.cyan('\n\n🧩Done...Connected'));


const rainbowColors = ['red', 'yellow', 'green', 'blue', 'purple'];
let index = 0;

function printRainbowMessage() {
  const color = rainbowColors[index];
  console.log(chalk.keyword(color)('\n\n⏳️waiting for messages'));
  index = (index + 1) % rainbowColors.length;
  setTimeout(printRainbowMessage, 60000);  // Adjust the timeout for desired speed
}

printRainbowMessage();
}
    
        
                if (
            connection === "close" &&
            lastDisconnect &&
            lastDisconnect.error &&
            lastDisconnect.error.output.statusCode != 401
        ) {
            startZyren()
        }
    })
    Zyren.ev.on('creds.update', saveCreds)
    Zyren.ev.on("messages.upsert",  () => { })

    Zyren.sendText = (jid, text, quoted = '', options) => Zyren.sendMessage(jid, {
        text: text,
        ...options
    }, {
        quoted,
        ...options
    })
    Zyren.sendTextWithMentions = async (jid, text, quoted, options = {}) => Zyren.sendMessage(jid, {
        text: text,
        mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
        ...options
    }, {
        quoted
    })
    Zyren.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        let buffer
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options)
        } else {
            buffer = await imageToWebp(buff)
        }

        await Zyren.sendMessage(jid, {
            sticker: {
                url: buffer
            },
            ...options
        }, {
            quoted
        })
        return buffer
    }
    Zyren.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        let buffer
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options)
        } else {
            buffer = await videoToWebp(buff)
        }

        await Zyren.sendMessage(jid, {
            sticker: {
                url: buffer
            },
            ...options
        }, {
            quoted
        })
        return buffer
    }
    Zyren.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(quoted, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        let type = await FileType.fromBuffer(buffer)
        trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
        // save to file
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

//welcome
Zyren.ev.on('group-participants.update', async (anu) => {
    	if (global.welcome){
console.log(anu)
try {
let metadata = await Zyren.groupMetadata(anu.id)
let participants = anu.participants
for (let num of participants) {
try {
ppuser = await Zyren.profilePictureUrl(num, 'image')
} catch (err) {
ppuser = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png?q=60'
}
try {
ppgroup = await Zyren.profilePictureUrl(anu.id, 'image')
} catch (err) {
ppgroup = 'https://i.ibb.co/RBx5SQC/avatar-group-large-v2.png?q=60'
}
	
memb = metadata.participants.length
ZyrenWlcm = await getBuffer(ppuser)
ZyrenLft = await getBuffer(ppuser)
                if (anu.action == 'add') {
                const Mariabuffer = await getBuffer(ppuser)
                let MariaName = num
                const xtime = moment.tz('Asia/Kolkata').format('HH:mm:ss')
	            const xdate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY')
	            const xmembers = metadata.participants.length
Zyrenbody = `┌──⊰ 🎗𝑾𝑬𝑳𝑪𝑶𝑴𝑬🎗⊰
│⊳  🌐 To: ${metadata.subject}
│⊳  📋 Name: @${MariaName.split("@")[0]}
│⊳  👥 Members: ${xmembers}th
│⊳  🕰️ Joined: ${xtime} ${xdate}
└──────────⊰`
Zyren.sendMessage(anu.id,
 { text: Zyrenbody,
 contextInfo:{
 mentionedJid:[num],
 "externalAdReply": {"showAdAttribution": true,
 "containsAutoReply": true,
 "title": ` ${global.botname}`,
"body": `${ownername}`,
 "previewType": "PHOTO",
"thumbnailUrl": ``,
"thumbnail": ZyrenWlcm,
"sourceUrl": `${link}`}}})
                } else if (anu.action == 'remove') {
                	const Zyrenbuffer = await getBuffer(ppuser)
                    const Zyrentime = moment.tz('Asia/Kolkata').format('HH:mm:ss')
	                const Zyrendate = moment.tz('Asia/Kolkata').format('DD/MM/YYYY')
                	let ZyrenName = num
                    const Zyrenmembers = metadata.participants.length
     Mariabody = `┌──⊰🍁𝑭𝑨𝑹𝑬𝑾𝑬𝑳𝑳🍁⊰
│⊳  👤 From: ${metadata.subject}
│⊳  📃 Reason: Left
│⊳  📔 Name: @${ZyrenName.split("@")[0]}
│⊳  👥 Members: ${Zyrenmembers}th
│⊳  🕒 Time: ${Zyrentime} ${Zyrendate}
└──────────⊰`
Zyren.sendMessage(anu.id,
 { text: Mariabody,
 contextInfo:{
 mentionedJid:[num],
 "externalAdReply": {"showAdAttribution": true,
 "containsAutoReply": true,
 "title": ` ${global.botname}`,
"body": `${ownername}`,
 "previewType": "PHOTO",
"thumbnailUrl": ``,
"thumbnail": ZyrenLft,
"sourceUrl": `${link}`}}})
}
}
} catch (err) {
console.log(err)
}
}
})
    Zyren.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }

        return buffer
    }
    }
return startZyren()

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update ${__filename}`))
    delete require.cache[file]
    require(file)
})

process.on('uncaughtException', function (err) {
let e = String(err)
if (e.includes("Socket connection timeout")) return
if (e.includes("item-not-found")) return
if (e.includes("rate-overlimit")) return
if (e.includes("Connection Closed")) return
if (e.includes("Timed Out")) return
if (e.includes("Value not found")) return
console.log('Caught exception: ', err)
})