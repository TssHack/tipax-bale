const BaleBot = require('node-telegram-bot-api');
const axios = require('axios');

// توکن ربات بله خود را وارد کنید
const token = '2071296181:C1ouATv8fb7OjzcR5y8aqlwtEnxlkPrMFCtNzqGz'; // توکن ربات بله
const options = {
    baseApiUrl: 'https://tapi.bale.ai',
};

const bot = new BaleBot(token, options);

// URL API تیپاکس
const API_URL = 'https://open.wiki-api.ir/apis-1/TipaxInfo?code=';

// کش بسته‌ها برای جلوگیری از درخواست‌های تکراری
const packageCache = {};

// دستور شروع
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const msg_id = msg.message_id;
    await bot.sendMessage(chatId, 'سلام! 👋\nبرای پیگیری مرسوله تیپاکس، کد رهگیری را وارد کنید.\nبرای دریافت راهنما، /help را تایپ کنید.', {
        reply_to_message_id: msg_id
    });
});

// دستور کمک
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const msg_id = msg.message_id;
    await bot.sendMessage(chatId, `
        سلام! 👋
        برای پیگیری مرسوله تیپاکس خود کافیست کد رهگیری را ارسال کنید.
        من اطلاعات مربوط به بسته شما را از سیستم تیپاکس دریافت کرده و برایتان ارسال می‌کنم.
        
        فقط کافیست کد رهگیری را بفرستید! 📦
        
        برای شروع مجدد دستور /start را تایپ کنید.
    `, {
        reply_to_message_id: msg_id
    });
});

// دریافت کد رهگیری و پیگیری مرسوله
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userText = msg.text.trim();
    const msg_id = msg.message_id;

    // اگر پیام /start یا /help باشد، از آن صرفنظر کن
    if (userText.toLowerCase().startsWith('/start') || userText.toLowerCase().startsWith('/help')) {
        return;
    }

    // بررسی اینکه آیا متن 10 رقمی است و شامل عدد باشد (کد رهگیری تیپاکس)
    if (userText.length === 21 && /^\d+$/.test(userText)) {
        const trackingCode = userText;

        // بررسی کش برای جلوگیری از درخواست‌های تکراری
        if (packageCache[trackingCode]) {
            await bot.sendMessage(chatId, packageCache[trackingCode], {
                reply_to_message_id: msg_id
            });
            return;
        }

        // ارسال پیام "لطفاً صبر کنید..."
        const please = await bot.sendMessage(chatId, 'لطفاً کمی صبر کنید...', {
            reply_to_message_id: msg_id
        });

        try {
            const response = await axios.get(`${API_URL}${trackingCode}`);
            const data = response.data;

            if (data.status) {
                const packageInfo = data.results;
                const senderInfo = packageInfo.sender;
                const receiverInfo = packageInfo.receiver;
                const statusInfo = packageInfo.status_info
                    .map(status => `📅 ${status.date} - ${status.status} - ${status.representation}`)
                    .join("\n");

                const message = `
                    **📦 اطلاعات مرسوله:**
                    **فرستنده:** ${senderInfo.name} - ${senderInfo.city}
                    **گیرنده:** ${receiverInfo.name} - ${receiverInfo.city}

                    **اطلاعات بسته:**
                    - ⚖️ وزن: ${packageInfo.weight} کیلوگرم
                    - 💰 هزینه کل: ${packageInfo.total_cost} ریال
                    - 💳 نوع پرداخت: ${packageInfo.pay_type}
                    - 🌍 مسافت: ${packageInfo.city_distance} کیلومتر (زون ${packageInfo.distance_zone})

                    **📝 وضعیت بسته:**
                    ${statusInfo}
                `;

                // ذخیره‌سازی کش برای پیگیری‌های بعدی
                packageCache[trackingCode] = message;

                // ارسال پیام به کاربر
                await bot.editMessageText(message, {
                    chat_id: chatId,
                    message_id: please.message_id
                });
            } else {
                await bot.editMessageText('🚨 متاسفانه اطلاعاتی برای این کد رهگیری پیدا نشد. لطفاً دوباره تلاش کنید.', {
                    chat_id: chatId,
                    message_id: please.message_id
                });
            }
        } catch (error) {
            await bot.editMessageText('❌ خطا در اتصال به سرور، لطفاً بعداً دوباره تلاش کنید.', {
                chat_id: chatId,
                message_id: please.message_id
            });
            console.error('Error:', error);
        }
    } else {
        await bot.sendMessage(chatId, 'لطفاً کد رهگیری معتبر وارد کنید. کد رهگیری باید 10 رقم باشد.');
    }
});

// شروع ربات
bot.startPolling();
