import telebot
import os

# الحصول على التوكن من متغيرات البيئة (أفضل للممارسات الأمنية)
API_TOKEN = os.getenv('8216401266:AAHDOllDFOEH6oya0FAX_vaQj6UJlvjX7eY')
bot = telebot.TeleBot(API_TOKEN)

@bot.message_handler(commands=['start'])
def send_welcome(message):
    bot.reply_to(message, "أهلاً بك! أنا أعمل الآن على منصة Render.")

if __name__ == "__main__":
    bot.polling()
