const { Telegraf } = require('telegraf');
require('dotenv').config();

if (!process.env.BOT_TOKEN) {
    throw new Error('Chưa cấu hình BOT_TOKEN trong file .env');
}

const bot = new Telegraf(process.env.BOT_TOKEN);

module.exports = bot;