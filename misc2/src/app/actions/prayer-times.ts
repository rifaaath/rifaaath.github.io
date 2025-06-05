
'use server';

import {
  set, addDays, isSameDay, isToday, startOfDay as dfnsStartOfDay,
  differenceInMinutes, addMinutes, parse as dateFnsParse, format as dfnsFormat,
  getYear, getMonth, getDate as dfnsGetDate, getHours, getMinutes, getSeconds
} from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'; // Explicit named imports
import * as cheerio from 'cheerio';
import type { Browser as PuppeteerBrowser } from 'puppeteer';
import type { Browser as PuppeteerCoreBrowser } from 'puppeteer-core';

const berlinTimeZone = 'Europe/Berlin';

export interface PrayerTime {
  name: string;
  time: string; // Display time string "HH:mm"
  dateTime: Date; // Date object representing Berlin time components as UTC
}

export interface PrayerTimesData {
  date: string; // Display date string, Berlin formatted
  hijriDate?: string;
  times: { name: string; time: string }[]; // name and display time
  nextPrayer: {
    name: string;
    time: string; // Display time
    dateTime: Date; // True UTC Date object for the prayer
    timeUntil: string;
  } | null;
  currentPrayer: {
    name: string;
    time: string; // Display time
  } | null;
  error?: string;
  isStaleData?: boolean;
}

const MAWAQIT_URL = "https://mawaqit.net/en/friedenmoschee-erlangen";

function parseScrapedDate(dateText: string): Date | null {
  const cleanedDateText = dateText.replace(/[.,]/g, '');
  const dayMonthYearFormats = ['d MMM yyyy', 'd MMMM yyyy'];
  for (const formatStr of dayMonthYearFormats) {
    try {
        const dateOnlyText = cleanedDateText.split(' ').slice(1).join(' ');
        if (dateOnlyText) {
            let parsed = dateFnsParse(dateOnlyText, formatStr, new Date());
            if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
        }
        let parsed = dateFnsParse(cleanedDateText, formatStr, new Date());
        if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
    } catch (e) { /* continue */ }
  }

  const specificFormats = ['EEEE d MMM yyyy', 'EEEE MMMM d yyyy'];
  for (const formatStr of specificFormats) {
    try {
      let parsed = dateFnsParse(dateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;

      parsed = dateFnsParse(cleanedDateText, formatStr, new Date());
      if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
    } catch (e) { /* continue */ }
  }

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


// Parses a time string (HH:mm) for a given Berlin YYYY-MM-DD string.
// Returns a Date object where UTC components match the Berlin time components.
function parsePrayerTime(timeStr: string, forBerlinYMD: string): Date | null {
  if (!timeStr || !forBerlinYMD) {
    console.warn("parsePrayerTime: Received empty or null timeStr or forBerlinYMD string.");
    return null;
  }

  const timePart = timeStr.trim();
  if (!timePart || !timePart.includes(':')) {
    console.warn(`parsePrayerTime: Invalid time string format: "${timeStr}"`);
    return null;
  }

  const [hoursStr, minutesStr] = timePart.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn(`parsePrayerTime: Invalid hour/minute numbers for: "${timeStr}"`);
    return null;
  }

  // Construct ISO-like string with Z to signify UTC.
  // The components H, M are Berlin time components.
  const isoString = `${forBerlinYMD}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00Z`;
  
  try {
    const parsedDate = dateFnsParse(isoString, "yyyy-MM-dd'T'HH:mm:ss'Z'", new Date(0));
    if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
    console.warn(`parsePrayerTime: Failed to parse constructed ISO string: "${isoString}"`);
    return null;
  } catch (e: any) {
    console.error(`parsePrayerTime: Error parsing ISO string "${isoString}":`, e);
    return null;
  }
}

// Fallback data uses Berlin time components as UTC for consistency
function createErrorFallbackData(errorMessage: string, currentBerlinTimeAsUTC: Date): PrayerTimesData {
  let displayDate = "Error loading date";
  
  // currentBerlinTimeAsUTC is already "Berlin time components as UTC"
  // For display, we need to format it *as if* it's Berlin time.
  const fallbackBerlinYMD = dfnsFormat(currentBerlinTimeAsUTC, 'yyyy-MM-dd'); // YMD of Berlin, from the UTC components
  const fallbackDateForDisplay = dateFnsParse(fallbackBerlinYMD, 'yyyy-MM-dd', new Date(0)); // True UTC for that Berlin day's midnight (00:00Z)

  try {
    // To display this 00:00Z date correctly as Berlin date string.
    displayDate = formatInTimeZone(fallbackDateForDisplay, berlinTimeZone, 'EEEE, d. MMM yyyy');
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
  
  fallbackTimesRawInfo.forEach(ft => {
    // parsePrayerTime expects berlinYMD, so we provide the one from currentBerlinTimeAsUTC
    const dt = parsePrayerTime(ft.timeStr, fallbackBerlinYMD);
    if (dt) {
      // For display, format its UTC components (which are Berlin time)
      fallbackDisplayTimes.push({ name: ft.name, time: dfnsFormat(dt, 'HH:mm') });
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
  rawPrayerTimes: PrayerTime[], // dateTime is Berlin components as UTC
  serverTimeBerlinAsUTC: Date, // Berlin components as UTC
  currentBerlinYMD: string // YYYY-MM-DD for the prayer times day
): {
  nextPrayer: Omit<Exclude<PrayerTimesData['nextPrayer'], null>, 'dateTime'> & { dateTime: Date } | null; // dateTime here is Berlin components as UTC
  currentPrayer: PrayerTimesData['currentPrayer'];
} {
  let nextPrayerInfo: Omit<Exclude<PrayerTimesData['nextPrayer'], null>, 'dateTime'> & { dateTime: Date } | null = null;
  let currentPrayerInfo: PrayerTimesData['currentPrayer'] = null;

  const salatPrayers = rawPrayerTimes
    .filter(p => p.dateTime instanceof Date && !isNaN(p.dateTime.getTime()) && p.name !== 'Sunrise')
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  if (salatPrayers.length === 0) {
    console.warn("calculatePrayerStatus: No valid salat prayers to process.");
    return { nextPrayer: null, currentPrayer: null };
  }

  const todayFajr = salatPrayers.find(p => p.name === 'Fajr');

  // Check if current time is before today's Fajr (i.e., still "yesterday's Isha" period)
  if (todayFajr && serverTimeBerlinAsUTC < todayFajr.dateTime) {
    // Try to find Isha from the *current* list (which is for currentBerlinYMD)
    const ishaDataForToday = salatPrayers.find(p => p.name === 'Isha');
    if (ishaDataForToday) {
        // Construct "yesterday's Isha" by taking today's Isha time and moving it to previous day
        const yesterdayIshaDateTime = addDays(ishaDataForToday.dateTime, -1);
        if (serverTimeBerlinAsUTC >= yesterdayIshaDateTime) {
            currentPrayerInfo = {
                name: 'Isha',
                time: dfnsFormat(yesterdayIshaDateTime, 'HH:mm') // Format its UTC (Berlin) time
            };
        }
    }
  }

  if (!currentPrayerInfo) {
    for (let i = 0; i < salatPrayers.length; i++) {
      const prayer = salatPrayers[i];
      let endCurrentPrayerTime: Date;

      if (prayer.name === 'Isha') {
        // End of Isha is Fajr of the *next* day
        let tomorrowFajrDateTime: Date;
        if (todayFajr) { // todayFajr is from currentBerlinYMD
           tomorrowFajrDateTime = addDays(todayFajr.dateTime, 1);
        } else {
           // Extremely rare fallback: if Fajr isn't in list, synthesize one for next day
           const nextDayBerlinYMD = dfnsFormat(addDays(dateFnsParse(currentBerlinYMD, 'yyyy-MM-dd', new Date(0)), 1), 'yyyy-MM-dd');
           const syntheticFajr = parsePrayerTime('03:30', nextDayBerlinYMD);
           if (syntheticFajr) {
             tomorrowFajrDateTime = syntheticFajr;
           } else { // Should not happen
             tomorrowFajrDateTime = addDays(prayer.dateTime, 8 * 60 * 60 * 1000); // 8 hours later
           }
           console.warn(`calculatePrayerStatus: Fallback for Isha end time. Using synthetic Fajr for next day.`);
        }
        endCurrentPrayerTime = tomorrowFajrDateTime;
      } else {
        const nextPrayerInList = salatPrayers[i + 1];
        if (nextPrayerInList) {
          endCurrentPrayerTime = nextPrayerInList.dateTime;
        } else {
           // Should not happen if Isha is last, but as a guard
           endCurrentPrayerTime = addMinutes(prayer.dateTime, 90);
           console.warn(`calculatePrayerStatus: Last prayer ${prayer.name} is not Isha, and no next prayer found. Setting arbitrary end time.`);
        }
      }

      if (serverTimeBerlinAsUTC >= prayer.dateTime && serverTimeBerlinAsUTC < endCurrentPrayerTime) {
        currentPrayerInfo = { name: prayer.name, time: prayer.time }; // prayer.time is display string
        break;
      }
    }
  }
  
  for (const prayer of salatPrayers) {
    if (serverTimeBerlinAsUTC < prayer.dateTime) {
      const diffMinutesTotal = differenceInMinutes(prayer.dateTime, serverTimeBerlinAsUTC);
      const hoursUntil = Math.floor(diffMinutesTotal / 60);
      const minutesUntil = diffMinutesTotal % 60;
      let timeUntilStr = '';
      if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
      timeUntilStr += `${minutesUntil}m`;

      nextPrayerInfo = {
        name: prayer.name,
        time: prayer.time, // display string
        dateTime: prayer.dateTime, // Berlin components as UTC
        timeUntil: timeUntilStr.trim(),
      };
      break;
    }
  }

  // If no next prayer today, next prayer is tomorrow's Fajr
  if (!nextPrayerInfo && todayFajr) {
    const tomorrowFajrDateTime = addDays(todayFajr.dateTime, 1);
    // Check if serverTime is still before this future Fajr (it should be if we are in this block)
     if (serverTimeBerlinAsUTC < tomorrowFajrDateTime) { 
        const diffMinutesTotal = differenceInMinutes(tomorrowFajrDateTime, serverTimeBerlinAsUTC);
        const hoursUntil = Math.floor(diffMinutesTotal / 60);
        const minutesUntil = diffMinutesTotal % 60;
        let timeUntilStr = '';
        if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
        timeUntilStr += `${minutesUntil}m`;

        nextPrayerInfo = {
          name: todayFajr.name,
          time: todayFajr.time, // display string
          dateTime: tomorrowFajrDateTime, // Berlin components as UTC for next day
          timeUntil: `${timeUntilStr.trim()} (tomorrow)`,
        };
    }
  }
  return { nextPrayer: nextPrayerInfo, currentPrayer: currentPrayerInfo };
}


export async function getPrayerTimes(): Promise<PrayerTimesData> {
  const initialUTCDate = new Date(); // True UTC
  console.log(`[PTIMES] Raw initialUTCDate: ${initialUTCDate.toISOString()} (Year: ${getYear(initialUTCDate)}, Month: ${getMonth(initialUTCDate)}, Day: ${dfnsGetDate(initialUTCDate)}, H: ${getHours(initialUTCDate)}, M: ${getMinutes(initialUTCDate)}, S: ${getSeconds(initialUTCDate)})`);
  console.log(`[PTIMES] Direct format of initialUTCDate for Berlin: ${formatInTimeZone(initialUTCDate, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX')}`);

  // serverTimeBerlinAsUTC will have its UTC components representing Berlin time components due to toZonedTime's behavior on Vercel
  const serverTimeBerlinAsUTC = toZonedTime(initialUTCDate, berlinTimeZone);
  console.log(`[PTIMES] serverTimeBerlinAsUTC (after toZonedTime): ${serverTimeBerlinAsUTC.toISOString()}`);
  console.log(`[PTIMES] serverTimeBerlinAsUTC formatted for Berlin: ${formatInTimeZone(serverTimeBerlinAsUTC, berlinTimeZone, 'yyyy-MM-dd HH:mm:ss XXX')} (Note: formatInTimeZone re-interprets based on its UTC value)`);

  let browser: PuppeteerBrowser | PuppeteerCoreBrowser | undefined;
  let htmlContent: string;
  const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
  const IS_VERCEL_PRODUCTION = process.env.VERCEL_ENV === 'production';

  try {
    if (BROWSERLESS_TOKEN) {
      console.log("Using Browserless.io for Puppeteer connection.");
      const puppeteerCore = await import('puppeteer-core');
      const browserWSEndpoint = `wss://production-ams.browserless.io?token=${BROWSERLESS_TOKEN}`;
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
      return createErrorFallbackData("Puppeteer configuration error in production.", serverTimeBerlinAsUTC);
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
      return createErrorFallbackData(`Puppeteer navigation failed: ${gotoError.message}`, serverTimeBerlinAsUTC);
    }
    console.log("Navigation successful. Current URL:", page.url());

    try {
      await page.waitForSelector('div.prayers .time div', { timeout: 15000 });
      console.log("Main prayer time selector found.");
    } catch (selectorError) {
      console.warn("waitForSelector for prayer times timed out.");
    }
    
    try {
        await page.waitForSelector('#gregorianDate', { timeout: 25000, visible: true });
        console.log("Gregorian date element (#gregorianDate) is visible.");
    } catch (dateSelectorError) {
        console.warn("waitForSelector for #gregorianDate timed out or element not visible.");
    }
    
    htmlContent = await page.content();
    await page.close();

    const $ = cheerio.load(htmlContent);
    let rawPrayerTimes: PrayerTime[] = [];
    let displayGregorianDate: string;
    let hijriDateDisplay: string | undefined;

    // This is the YYYY-MM-DD string FOR THE DAY IN BERLIN that prayer times will be parsed for.
    let prayerDataBerlinYMD: string;
    let isStaleData = false;

    // True UTC date representing midnight of the server's current day in Berlin
    // This is the actual 00:00Z in Berlin, used for display purposes primarily.
    const serverTodayTrueUTCMidnightBerlin = dfnsStartOfDay(toZonedTime(initialUTCDate, berlinTimeZone));
    
    // YMD string of the server's current day in Berlin
    const serverTodayBerlinYMD = formatInTimeZone(initialUTCDate, berlinTimeZone, 'yyyy-MM-dd');

    const scrapedDateText = $('#gregorianDate').text().trim();
    console.log("Scraped Gregorian date text from page:", `"${scrapedDateText}"`);

    if (scrapedDateText) {
      const parsedScrapedDateRaw = parseScrapedDate(scrapedDateText); // This is a true UTC Date from parsing "Day, DD Month YYYY"

      if (parsedScrapedDateRaw) {
        // YMD string of the scraped date, as interpreted in Berlin
        const scrapedBerlinYMD = formatInTimeZone(parsedScrapedDateRaw, berlinTimeZone, 'yyyy-MM-dd');
        console.log(`Scraped date (Berlin YMD): ${scrapedBerlinYMD}, Server date (Berlin YMD): ${serverTodayBerlinYMD}`);

        if (scrapedBerlinYMD === serverTodayBerlinYMD) {
          console.log("Scraped date is current for Berlin.");
          prayerDataBerlinYMD = scrapedBerlinYMD;
          // For display, use the true UTC midnight of this Berlin day, formatted for Berlin
          displayGregorianDate = formatInTimeZone(serverTodayTrueUTCMidnightBerlin, berlinTimeZone, 'EEEE, d. MMM yyyy');
        } else {
          console.warn(`Stale data! Scraped Berlin YMD: "${scrapedBerlinYMD}", Server Berlin YMD: "${serverTodayBerlinYMD}". Using server time.`);
          prayerDataBerlinYMD = serverTodayBerlinYMD;
          const formattedScrapedForDisplay = formatInTimeZone(parsedScrapedDateRaw, berlinTimeZone, 'd. MMM');
          displayGregorianDate = `${formatInTimeZone(serverTodayTrueUTCMidnightBerlin, berlinTimeZone, 'EEEE, d. MMM yyyy')} (Data for ${formattedScrapedForDisplay})`;
          isStaleData = true;
        }
      } else {
        console.warn(`Failed to parse scraped date string "${scrapedDateText}". Falling back to current server time.`);
        prayerDataBerlinYMD = serverTodayBerlinYMD;
        displayGregorianDate = `${formatInTimeZone(serverTodayTrueUTCMidnightBerlin, berlinTimeZone, 'EEEE, d. MMM yyyy')} (Scraped Date Invalid)`;
      }
    } else {
      console.warn("No date text found for '#gregorianDate'. Using current server time.");
      prayerDataBerlinYMD = serverTodayBerlinYMD;
      displayGregorianDate = formatInTimeZone(serverTodayTrueUTCMidnightBerlin, berlinTimeZone, 'EEEE, d. MMM yyyy');
    }
    console.log("Effective Berlin YMD for prayer time parsing:", prayerDataBerlinYMD);

    hijriDateDisplay = $('#hijriDate').first().text().trim() || undefined;

    $('div.prayers > div').each((_i, el) => {
      const name = $(el).find('.name').text().trim();
      const timeString = $(el).find('.time > div').first().text().trim(); // "HH:mm"

      if (name && timeString) {
        // prayerDateTime will have UTC components = Berlin time components
        const prayerDateTime = parsePrayerTime(timeString, prayerDataBerlinYMD);
        if (prayerDateTime) {
          rawPrayerTimes.push({
            name,
            time: timeString, // Keep original display string
            dateTime: prayerDateTime,
          });
          console.log(`Parsed prayer: ${name} at ${timeString} (Berlin components as UTC: ${prayerDateTime.toISOString()}) for Berlin YMD ${prayerDataBerlinYMD}`);
        } else {
          console.warn(`Failed to parse prayer time for ${name}: ${timeString} for Berlin YMD ${prayerDataBerlinYMD}`);
        }
      }
    });

    if (rawPrayerTimes.length === 0) {
      console.warn('No prayer times were successfully parsed.');
      console.log('Prayer section HTML:', $('div.prayers').html());
      return createErrorFallbackData("Failed to find prayer times on the page.", serverTimeBerlinAsUTC);
    }

    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    const { nextPrayer: nextPrayerInfoBerlinComponents, currentPrayer: currentPrayerInfo } = calculatePrayerStatus(rawPrayerTimes, serverTimeBerlinAsUTC, prayerDataBerlinYMD);
    
    let finalNextPrayerInfoForClient: PrayerTimesData['nextPrayer'] = null;
    if (nextPrayerInfoBerlinComponents) {
      // Convert the nextPrayerInfo.dateTime from "Berlin components as UTC" back to "true UTC" for the client.
      // The offset captures how much toZonedTime shifted the original UTC.
      const offsetMilliseconds = serverTimeBerlinAsUTC.getTime() - initialUTCDate.getTime();
      const trueUtcNextPrayerDateTime = new Date(nextPrayerInfoBerlinComponents.dateTime.getTime() - offsetMilliseconds);
      
      finalNextPrayerInfoForClient = {
        ...nextPrayerInfoBerlinComponents,
        dateTime: trueUtcNextPrayerDateTime, // This is now a true UTC Date object
      };
    }


    return {
      date: displayGregorianDate,
      hijriDate: hijriDateDisplay,
      times: displayTimes,
      nextPrayer: finalNextPrayerInfoForClient,
      currentPrayer: currentPrayerInfo,
      isStaleData,
    };

  } catch (unexpectedError: any) {
    console.error("An unexpected server error occurred in getPrayerTimes:", unexpectedError.message, unexpectedError.stack);
    const errorFallbackTime = serverTimeBerlinAsUTC instanceof Date && !isNaN(serverTimeBerlinAsUTC.getTime()) ? serverTimeBerlinAsUTC : toZonedTime(new Date(), berlinTimeZone);
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, errorFallbackTime);
  } finally {
    if (browser) {
      console.log("Closing Puppeteer browser/connection in finally block.");
      await browser.close();
    }
  }
}


