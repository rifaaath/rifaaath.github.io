
'use server';

import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { headers } from 'next/headers';
import { formatInTimeZone } from 'date-fns-tz';

// Rate limiter: Allow 2 requests per 10-minute window.
const ratelimit = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(2, '10 m'),
  analytics: true,
  prefix: 'sos_ratelimit',
});

interface SosNotificationPayload {
  name?: string;
  comment?: string;
}

export async function sendSosNotification(
  payload: SosNotificationPayload
): Promise<{ success: boolean; message: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in environment variables.');
    return { success: false, message: 'Server configuration error: Missing Telegram credentials.' };
  }
  
  // Only apply rate limiting if Vercel KV environment variables are set.
  const isRateLimiterConfigured = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;

  if (isRateLimiterConfigured) {
    // Use IP address for rate limiting
    const ip = (await headers()).get('x-forwarded-for') ?? '127.0.0.1';
    const { success: isWithinRateLimit, limit, remaining, reset } = await ratelimit.limit(ip);

    if (!isWithinRateLimit) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000 / 60);
      return { success: false, message: `Rate limit exceeded. Please try again in about ${retryAfter} minutes.` };
    }
  } else {
    // Log a warning in production if KV is not configured, but don't block the request.
    if (process.env.NODE_ENV === 'production') {
      console.warn('Vercel KV for rate limiting is not configured. Skipping rate limit check.');
    }
  }


  try {
    const berlinTimeZone = 'Europe/Berlin';
    const now = new Date();
    const formattedDateTime = formatInTimeZone(now, berlinTimeZone, 'dd/MM/yyyy HH:mm:ss');
    
    let messageText = `🚨 *Urgent Assistance Needed!* 🚨\n`;
    messageText += `*Time:* ${formattedDateTime}\n\n`;

    if (payload.name) {
      messageText += `*From:* ${payload.name}\n`;
    }
    if (payload.comment) {
      messageText += `*Comment:* \n${payload.comment}\n`;
    }


    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const res = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: 'Markdown'
      }),
    });

    const responseData = await res.json();

    if (!responseData.ok) {
      console.error(`Telegram API failed with error: ${responseData.description}`);
      return { success: false, message: `Failed to send notification. (${responseData.description})` };
    }

    return { success: true, message: 'Notification sent successfully to Telegram!' };
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}
