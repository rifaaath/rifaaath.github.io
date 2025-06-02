
'use server';

import { set, addDays, isSameDay, isToday, startOfDay, differenceInMinutes, addMinutes, parse as dateFnsParse, format } from 'date-fns';
import * as DFNSTZ from 'date-fns-tz'; // Using namespace import
import * as cheerio from 'cheerio';
import type { Browser as PuppeteerBrowser } from 'puppeteer';
import type { Browser as PuppeteerCoreBrowser } from 'puppeteer-core';

const berlinTimeZone = 'Europe/Berlin';

export interface PrayerTime {
  name: string;
  time: string;
  dateTime: Date;
}

export interface PrayerTimesData {
  date: string;
  hijriDate?: string;
  times: { name: string; time: string }[];
  nextPrayer: {
    name: string;
    time: string;
    dateTime: Date;
    timeUntil: string;
  } | null;
  currentPrayer: {
    name: string;
    time: string;
  } | null;
  error?: string;
  isStaleData?: boolean;
}

const MAWAQIT_URL = "https://mawaqit.net/en/friedenmoschee-erlangen";

function zonedTimeToUtc(date: Date | string, timeZone: string): Date {
  // Convert input to zoned time, then get the UTC equivalent
  const zoned = DFNSTZ.toZonedTime(date, timeZone);
  const utc = new Date(zoned.getTime() - zoned.getTimezoneOffset() * 60 * 1000);
  return utc;
}

function parseScrapedDate(dateText: string): Date | null {
  const cleanedDateText = dateText.replace(/[.,]/g, '');
  // Attempt to parse with "d MMM yyyy" or "d MMMM yyyy" first, as these are more specific
  const specificFormats = ['d MMM yyyy', 'd MMMM yyyy', 'EEEE d MMM yyyy', 'EEEE MMMM d yyyy'];
  for (const formatStr of specificFormats) {
    try {
      // Try parsing the original text
      let parsed = dateFnsParse(dateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;

      // Try parsing the cleaned text
      parsed = dateFnsParse(cleanedDateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
    } catch (e) { /* continue */ }
  }
  
  // Broader date formats as a fallback
  const generalFormats = [
    'd/M/yyyy', 'yyyy-MM-dd', 'MMMM d, yyyy', 'MMM d, yyyy'
  ];
  for (const formatStr of generalFormats) {
     try {
      let parsed = dateFnsParse(dateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
      parsed = dateFnsParse(cleanedDateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
    } catch (e) { /* continue */ }
  }

  console.warn(`Failed to parse date with any known format: "${dateText}" (cleaned: "${cleanedDateText}")`);
  return null;
}


function parsePrayerTime(timeStr: string, baseDateBerlinMidnight: Date): Date | null {
  if (!timeStr) {
    console.warn("parsePrayerTime: Received empty or null time string.");
    return null;
  }
  if (!(baseDateBerlinMidnight instanceof Date) || isNaN(baseDateBerlinMidnight.getTime())) {
    console.warn("parsePrayerTime: Received invalid baseDate: " + String(baseDateBerlinMidnight) + ". Cannot parse time \"" + String(timeStr) + "\".");
    return null;
  }

  const timePart = timeStr.trim();
  if (!timePart || !timePart.includes(':')) {
    console.warn("parsePrayerTime: Invalid time string format (missing ':' or empty timePart): \"" + String(timeStr) + "\"");
    return null;
  }

  const [hoursStr, minutesStr] = timePart.split(':');
  if (!hoursStr || minutesStr === undefined) {
    console.warn("parsePrayerTime: Invalid time components for: \"" + String(timeStr) + "\" (hoursStr: " + String(hoursStr) + ", minutesStr: " + String(minutesStr) + ")");
    return null;
  }

  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn("parsePrayerTime: Failed to parse hour/minute numbers for: " + String(timeStr) + " (parsed hours=" + hours + ", parsed minutes=" + minutes + ")");
    return null;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn("parsePrayerTime: Hour/minute out of range for 24h format: " + String(timeStr) + " (hours=" + hours + ", minutes=" + minutes + ")");
    return null;
  }

  try {
    // `baseDateBerlinMidnight` is already set to midnight in Berlin (represented in UTC).
    // We are setting the hours and minutes onto this specific date.
    return set(baseDateBerlinMidnight, { hours, minutes, seconds: 0, milliseconds: 0 });
  } catch (e: any) {
    console.error("parsePrayerTime: Error calling 'set' for baseDate: " + String(baseDateBerlinMidnight) + ", hours: " + hours + ", minutes: " + minutes, e);
    return null;
  }
}

function createErrorFallbackData(errorMessage: string, serverTimeInBerlin: Date): PrayerTimesData {
  let displayDate = "Error loading date";
  let validFallbackDateBerlin = serverTimeInBerlin;

  if (!(validFallbackDateBerlin instanceof Date) || isNaN(validFallbackDateBerlin.getTime())) {
      console.error("CRITICAL: Invalid date provided to createErrorFallbackData. Using new Date() in Berlin TZ.");
      validFallbackDateBerlin = DFNSTZ.toZonedTime(new Date(), berlinTimeZone);
  }

  try {
    // This will format the date portion of `validFallbackDateBerlin` as it would appear in Berlin.
    displayDate = DFNSTZ.formatInTimeZone(validFallbackDateBerlin, berlinTimeZone, 'EEEE, d. MMM yyyy');
  } catch (e) {
    console.error("Error formatting date in createErrorFallbackData:", e);
    displayDate = "Date Unavailable (Formatting Error)";
  }

  const fallbackTimesRawInfo = [
    { name: 'Fajr', timeStr: '03:30' }, { name: 'Sunrise', timeStr: '05:30' },
    { name: 'Dhuhr', timeStr: '13:15' }, { name: 'Asr', timeStr: '17:30' },
    { name: 'Maghrib', timeStr: '21:15' }, { name: 'Isha', timeStr: '22:45' },
  ];
  const fallbackDisplayTimes: { name: string; time: string }[] = [];
  // Base date for fallback times should be midnight in Berlin for the `validFallbackDateBerlin`
  const fallbackBaseDate = startOfDay(validFallbackDateBerlin); 

  fallbackTimesRawInfo.forEach(ft => {
    const dt = parsePrayerTime(ft.timeStr, fallbackBaseDate); 
    if (dt) {
      fallbackDisplayTimes.push({ name: ft.name, time: DFNSTZ.formatInTimeZone(dt, berlinTimeZone, 'HH:mm') });
    } else {
      fallbackDisplayTimes.push({ name: ft.name, time: 'N/A' });
    }
  });

  return {
    date: `Error: ${displayDate}`,
    hijriDate: undefined,
    times: fallbackDisplayTimes,
    nextPrayer: null,
    currentPrayer: null,
    error: errorMessage,
    isStaleData: false, 
  };
}

function calculatePrayerStatus(
  rawPrayerTimes: PrayerTime[],
  serverTimeInBerlin: Date, 
  dateForPrayerTimesBerlin: Date 
): {
  nextPrayer: PrayerTimesData['nextPrayer'];
  currentPrayer: PrayerTimesData['currentPrayer'];
} {
  let nextPrayerInfo: PrayerTimesData['nextPrayer'] = null;
  let currentPrayerInfo: PrayerTimesData['currentPrayer'] = null;

  const salatPrayers = rawPrayerTimes
    .filter(p => p.name !== 'Sunrise' && p.dateTime instanceof Date && !isNaN(p.dateTime.getTime()))
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  if (salatPrayers.length === 0) {
    console.warn("calculatePrayerStatus: No valid salat prayers to process.");
    return { nextPrayer: null, currentPrayer: null };
  }
  
  const todayFajr = salatPrayers.find(p => p.name === 'Fajr');
  const todayIsha = salatPrayers.find(p => p.name === 'Isha');

  if (todayFajr && serverTimeInBerlin < todayFajr.dateTime) {
    if (todayIsha) {
        const yesterdayIshaDateTime = addDays(todayIsha.dateTime, -1); 
        if (serverTimeInBerlin >= yesterdayIshaDateTime) { 
            currentPrayerInfo = {
                name: 'Isha',
                time: DFNSTZ.formatInTimeZone(yesterdayIshaDateTime, berlinTimeZone, 'HH:mm') 
            };
        }
    }
  }
  
  if (!currentPrayerInfo) { 
    for (let i = 0; i < salatPrayers.length; i++) {
      const prayer = salatPrayers[i];
      let endCurrentPrayerTime: Date;

      if (prayer.name === 'Isha') {
        let tomorrowFajrDateTime: Date;
        const fajrDataForTomorrow = salatPrayers.find(p => p.name === 'Fajr'); 
        if (fajrDataForTomorrow) {
           tomorrowFajrDateTime = addDays(fajrDataForTomorrow.dateTime, 1); 
        } else {
           const dayAfterPrayerDate = addDays(dateForPrayerTimesBerlin, 1); 
           tomorrowFajrDateTime = set(dayAfterPrayerDate, { hours: 3, minutes: 30, seconds: 0, milliseconds: 0 });
           console.warn(`calculatePrayerStatus: Fallback for Isha end time. Using synthetic Fajr for ${DFNSTZ.formatInTimeZone(tomorrowFajrDateTime, berlinTimeZone, 'yyyy-MM-dd HH:mm')}`);
        }
        endCurrentPrayerTime = tomorrowFajrDateTime;
      } else {
        const nextPrayerInList = salatPrayers[i + 1];
        if (nextPrayerInList) {
          endCurrentPrayerTime = nextPrayerInList.dateTime;
        } else {
          endCurrentPrayerTime = addMinutes(prayer.dateTime, 90); 
           console.warn(`calculatePrayerStatus: Last prayer ${prayer.name} is not Isha, and no next prayer found. Setting arbitrary end time.`);
        }
      }

      if (serverTimeInBerlin >= prayer.dateTime && serverTimeInBerlin < endCurrentPrayerTime) {
        currentPrayerInfo = { name: prayer.name, time: prayer.time };
        break;
      }
    }
  }
  
  for (const prayer of salatPrayers) {
    if (serverTimeInBerlin < prayer.dateTime) {
      const diffMinutes = differenceInMinutes(prayer.dateTime, serverTimeInBerlin);
      const hoursUntil = Math.floor(diffMinutes / 60);
      const minutesUntil = diffMinutes % 60;
      let timeUntilStr = '';
      if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
      timeUntilStr += `${minutesUntil}m`;

      nextPrayerInfo = {
        name: prayer.name,
        time: prayer.time,
        dateTime: prayer.dateTime,
        timeUntil: timeUntilStr.trim(),
      };
      break;
    }
  }

  if (!nextPrayerInfo && todayFajr) { 
    const tomorrowFajrDateTime = addDays(todayFajr.dateTime, 1); 
    if (serverTimeInBerlin < tomorrowFajrDateTime) { 
        const diffMinutes = differenceInMinutes(tomorrowFajrDateTime, serverTimeInBerlin);
        const hoursUntil = Math.floor(diffMinutes / 60);
        const minutesUntil = diffMinutes % 60;
        let timeUntilStr = '';
        if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
        timeUntilStr += `${minutesUntil}m`;

        nextPrayerInfo = {
          name: todayFajr.name, 
          time: todayFajr.time, 
          dateTime: tomorrowFajrDateTime, 
          timeUntil: `${timeUntilStr.trim()} (tomorrow)`,
        };
    }
  }
  
  return { nextPrayer: nextPrayerInfo, currentPrayer: currentPrayerInfo };
}


export async function getPrayerTimes(): Promise<PrayerTimesData> {
  const serverTimeNowInBerlin = DFNSTZ.toZonedTime(new Date(), berlinTimeZone); 
  console.log("getPrayerTimes called at effective Berlin time:", DFNSTZ.formatInTimeZone(serverTimeNowInBerlin, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX'));
  
  let browser: PuppeteerBrowser | PuppeteerCoreBrowser | undefined;
  let htmlContent: string;
  const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
  const IS_VERCEL_PRODUCTION = process.env.VERCEL_ENV === 'production';

  try {
    if (BROWSERLESS_TOKEN) {
      console.log("Using Browserless.io for Puppeteer connection.");
      const puppeteerCore = await import('puppeteer-core');
      const browserWSEndpoint = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;
      browser = await puppeteerCore.connect({ browserWSEndpoint });
      console.log("Connected to Browserless.io instance.");
    } else if (!IS_VERCEL_PRODUCTION) {
      console.log("Local development: No Browserless token. Using local Puppeteer.");
      const puppeteer = await import('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ignoreHTTPSErrors: true,
      });
      console.log("Local Puppeteer browser launched.");
    } else {
      console.error("Production environment (Vercel) without BROWSERLESS_TOKEN. Cannot launch Puppeteer.");
      return createErrorFallbackData("Puppeteer configuration error in production.", serverTimeNowInBerlin);
    }
      
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log("Navigating to Mawaqit URL:", MAWAQIT_URL);
    try {
      await page.goto(MAWAQIT_URL, { waitUntil: 'networkidle0', timeout: 45000 }); 
    } catch (gotoError: any) {
      console.error("Puppeteer page.goto failed:", gotoError.message, gotoError.stack);
      if (browser) await browser.close(); 
      return createErrorFallbackData(`Puppeteer navigation failed: ${gotoError.message}`, serverTimeNowInBerlin);
    }
    console.log("Navigation successful. Current URL:", page.url());
    
    try {
      await page.waitForSelector('div.prayers .time div', { timeout: 15000 }); 
      console.log("Main prayer time selector found.");
    } catch (selectorError) {
      console.warn("waitForSelector for prayer times timed out. Page content might be incomplete or structure changed.");
    }

    try {
      await page.waitForSelector('#gregorianDate', { timeout: 20000, visible: true }); 
      console.log("Gregorian date element (#gregorianDate) is visible.");
    } catch (dateSelectorError) {
      console.warn("waitForSelector for #gregorianDate timed out or element not visible. Date might be missing or page structure changed.");
    }
    
    htmlContent = await page.content();
    await page.close(); 

    const $ = cheerio.load(htmlContent);
    let rawPrayerTimes: PrayerTime[] = [];
    let displayGregorianDate: string;
    let hijriDateDisplay: string | undefined;
    
    const serverTodayBerlinMidnight = startOfDay(serverTimeNowInBerlin); 
    let dateToParseTimesFor: Date; 
    let isStaleData = false;

    const scrapedDateText = $('#gregorianDate').text().trim();
    console.log("Scraped Gregorian date text from page:", `"${scrapedDateText}"`);

    if (scrapedDateText) {
      const parsedScrapedDateRaw = parseScrapedDate(scrapedDateText); 

      if (parsedScrapedDateRaw) {
        const scrapedDateStringYYYYMMDD = format(parsedScrapedDateRaw, 'yyyy-MM-dd');
        const scrapedDateBerlinMidnight = zonedTimeToUtc(scrapedDateStringYYYYMMDD, berlinTimeZone);
        console.log("Successfully parsed scraped date as Berlin midnight (UTC):", scrapedDateBerlinMidnight.toISOString(), `(Berlin: ${DFNSTZ.formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX')})`);
        
        if (isSameDay(scrapedDateBerlinMidnight, serverTodayBerlinMidnight)) {
          console.log("Scraped date is current. Using scraped date for display and calculations.");
          dateToParseTimesFor = scrapedDateBerlinMidnight;
          displayGregorianDate = DFNSTZ.formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy');
        } else {
          console.warn(`Stale data detected! Scraped date "${DFNSTZ.formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')}" is not today (${DFNSTZ.formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')}). Using current server time but marking as stale.`);
          dateToParseTimesFor = serverTodayBerlinMidnight; 
          const formattedScraped = DFNSTZ.formatInTimeZone(scrapedDateBerlinMidnight, berlinTimeZone, 'd. MMM');
          displayGregorianDate = `${DFNSTZ.formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')} (Data for ${formattedScraped})`;
          isStaleData = true;
        }
      } else {
        console.warn(`Failed to parse scraped date string "${scrapedDateText}". Falling back to current server time for parsing.`);
        dateToParseTimesFor = serverTodayBerlinMidnight;
        displayGregorianDate = `${DFNSTZ.formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy')} (Scraped Date Invalid)`;
      }
    } else {
      console.warn("No date text found using selector '#gregorianDate'. Using current server time for parsing.");
      dateToParseTimesFor = serverTodayBerlinMidnight;
      displayGregorianDate = DFNSTZ.formatInTimeZone(serverTodayBerlinMidnight, berlinTimeZone, 'EEEE, d. MMM yyyy');
    }
    console.log("Effective date for prayer time calculations (dateToParseTimesFor, Berlin midnight UTC):", dateToParseTimesFor.toISOString(), `(Berlin: ${DFNSTZ.formatInTimeZone(dateToParseTimesFor, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX')})`);

    hijriDateDisplay = $('#hijriDate').first().text().trim() || undefined;

    $('div.prayers > div').each((_i, el) => {
      const name = $(el).find('.name').text().trim();
      const timeString = $(el).find('.time > div').first().text().trim(); 

      if (name && timeString) {
        const prayerDateTime = parsePrayerTime(timeString, dateToParseTimesFor);
        if (prayerDateTime) {
          rawPrayerTimes.push({
            name,
            time: DFNSTZ.formatInTimeZone(prayerDateTime, berlinTimeZone, 'HH:mm'), 
            dateTime: prayerDateTime, 
          });
          console.log(`Parsed prayer: ${name} at ${DFNSTZ.formatInTimeZone(prayerDateTime, berlinTimeZone, 'HH:mm')} (UTC: ${prayerDateTime.toISOString()}) for date ${DFNSTZ.formatInTimeZone(dateToParseTimesFor, berlinTimeZone, 'yyyy-MM-dd')}`);
        } else {
          console.warn(`Failed to parse prayer time for ${name}: ${timeString} with base date ${DFNSTZ.formatInTimeZone(dateToParseTimesFor, berlinTimeZone, 'yyyy-MM-dd')}`);
        }
      }
    });

    if (rawPrayerTimes.length === 0) {
      console.warn('No prayer times were successfully parsed. Page structure might have changed.');
      console.log('Prayer section HTML:', $('div.prayers').html());
      return createErrorFallbackData("Failed to find prayer times on the page. Selectors may be outdated.", serverTimeNowInBerlin);
    }

    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    
    const { nextPrayer: nextPrayerInfo, currentPrayer: currentPrayerInfo } = calculatePrayerStatus(rawPrayerTimes, serverTimeNowInBerlin, dateToParseTimesFor);
    
    return {
      date: displayGregorianDate,
      hijriDate: hijriDateDisplay,
      times: displayTimes,
      nextPrayer: nextPrayerInfo,
      currentPrayer: currentPrayerInfo,
      isStaleData,
    };

  } catch (unexpectedError: any) {
    console.error("An unexpected server error occurred in getPrayerTimes:", unexpectedError.message, unexpectedError.stack);
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, DFNSTZ.toZonedTime(new Date(), berlinTimeZone));
  } finally {
    if (browser) {
      console.log("Closing Puppeteer browser/connection in finally block.");
      await browser.close();
    }
  }
}

