const fs = require('fs')
const chalk = require('chalk')

//contact details
global.ownernumber = ['776551215s']
global.ownername = "Toxic Panda"//owner name
global.ytname = "YT: IDK"
global.socialm = "GitHub: IDK"
global.location = "SriLanka"

global.botname = 'Zyren-MD' //name of the bot

//sticker details
global.stickername = 'ZYREN-MD'
global.packname = 'Sticker By'
global.author = ''
//console view/theme
global.themeemoji = '🧩'
global.wm = "Toxic Panda Bot INC."

//theme link
global.link = 'ikd'

//custom prefix
global.prefa = ['.']

//false=disable and true=enable
global.welcome = false //auto welcome
global.autoRecording = false //auto recording
global.autoTyping = false //auto typing
global.autorecordtype = false //auto typing + recording
global.autoread = false //auto read messages
global.autobio = false //auto update bio
global.anti212 = true //auto block +212
global.autoread_status = false //auto view status/story



//reply messages
global.mess = {
    done: '*Done!* \n\n*ZYREN-MD*\n\n*🧩 Zyren-MD Link:* \nhttps://github.com/IDK/IDK\n',
    prem: '*This Feature can be Used by Premium User Only*',
    admin: '*This Feature can be Used by Admin Only*',
    botAdmin: '*This Feature can Only be Used when the Bot is a Group Admin* ',
    owner: '*This Feature can be Used by Owner Only*',
    group: '*This Feature is Only for Groups*',
    private: '*This Feature is Only for Private Chats*',
    wait: '*In Process...* ',
    error: '*Oops..Error!*',
}

global.thumb = fs.readFileSync('./Gallery/thumb.jpg')

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
