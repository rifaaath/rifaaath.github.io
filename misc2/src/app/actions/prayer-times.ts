
'use server';

import { format, addMinutes, differenceInMinutes, parse, set, addDays } from 'date-fns';
import * as cheerio from 'cheerio';
// Import types for Browser. Explicit imports for puppeteer and puppeteer-core for clarity.
import type { Browser as PuppeteerBrowser } from 'puppeteer';
import type { Browser as PuppeteerCoreBrowser } from 'puppeteer-core';
import chromium from "@sparticuz/chromium-min";

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
}

const MAWAQIT_URL = "https://mawaqit.net/en/friedenmoschee-erlangen";

function parsePrayerTime(timeStr: string, baseDate: Date): Date | null {
  if (!timeStr) {
    console.warn("parsePrayerTime: Received empty or null time string.");
    return null;
  }
  if (!(baseDate instanceof Date) || isNaN(baseDate.getTime())) {
    console.warn("parsePrayerTime: Received invalid baseDate: " + String(baseDate) + ". Cannot parse time \"" + String(timeStr) + "\".");
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
    return set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 });
  } catch (e: any) {
    console.error("parsePrayerTime: Error calling 'set' for baseDate: " + String(baseDate) + ", hours: " + hours + ", minutes: " + minutes, e);
    return null;
  }
}

function createErrorFallbackData(errorMessage: string, serverTimeNowForFallback: Date): PrayerTimesData {
  let displayDate = "Error loading date";
  let validFallbackDate = serverTimeNowForFallback;

  if (!(validFallbackDate instanceof Date) || isNaN(validFallbackDate.getTime())) {
      console.error("CRITICAL: Invalid date provided to createErrorFallbackData. Using new Date().");
      validFallbackDate = new Date();
  }

  try {
    displayDate = format(validFallbackDate, 'EEEE, d. MMM yyyy');
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
    const dt = parsePrayerTime(ft.timeStr, validFallbackDate);
    if (dt) {
      fallbackDisplayTimes.push({ name: ft.name, time: format(dt, 'HH:mm') });
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
  };
}

export async function getPrayerTimes(): Promise<PrayerTimesData> {
  const serverTimeNow = new Date(); 
  let browser: PuppeteerBrowser | PuppeteerCoreBrowser | undefined;
  let htmlContent: string;

  try {
    console.log("Current environment VERCEL_ENV:", process.env.VERCEL_ENV);
    if (process.env.VERCEL_ENV === "production") {
      console.log("Production environment (Vercel) detected. Using puppeteer-core and @sparticuz/chromium-min.");
      // const chromium = await import("@sparticuz/chromium-min");
      const puppeteerCore = await import("puppeteer-core");
      const remoteExecutablePath = "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";
      
      const executablePath = await chromium.executablePath(remoteExecutablePath);
      console.log("Chromium executable path (Vercel):", executablePath);

      if (!executablePath) {
        throw new Error("Failed to get executable path from @sparticuz/chromium-min");
      }

      browser = await puppeteerCore.launch({
        args: chromium.args,
        executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true, // Important for some sites
      });
      console.log("Puppeteer-core browser launched on Vercel.");
    } else {
      console.log("Local development environment detected. Using full puppeteer.");
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ignoreHTTPSErrors: true,
      });
      console.log("Full puppeteer browser launched locally.");
    }
      
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 720 });
    
    console.log("Navigating to Mawaqit URL:", MAWAQIT_URL);
    try {
      await page.goto(MAWAQIT_URL, { waitUntil: 'domcontentloaded', timeout: 45000 }); 
    } catch (gotoError: any) {
      console.error("Puppeteer page.goto failed:", gotoError.message, gotoError.stack);
      return createErrorFallbackData(`Puppeteer navigation failed: ${gotoError.message}`, serverTimeNow);
    }
    console.log("Navigation successful.");
    
    try {
      await page.waitForSelector('div.prayers .time div', { timeout: 20000 }); 
      console.log("Main prayer time selector found.");
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      console.log("Short delay after waitForSelector complete.");
    } catch (selectorError) {
      console.warn("waitForSelector for prayer times timed out. Page content might be incomplete or structure changed.");
      const contentCheck = await page.content();
      if (!contentCheck.includes("prayer")) { 
          console.error("Essential prayer content not found on the page after timeout.");
      }
    }
    
    htmlContent = await page.content();
    await page.close(); // Close page once content is fetched

    const $ = cheerio.load(htmlContent);
    let rawPrayerTimes: PrayerTime[] = [];
    let displayGregorianDate: string;
    let hijriDateDisplay: string | undefined;
    let dateToParseTimesFor: Date = serverTimeNow;

    const scrapedDateText = $('#gregorianDate').text().trim();
    if (scrapedDateText) {
      displayGregorianDate = scrapedDateText; 
      try {
        // Expected format: EEEE, d. MMM yyyy (e.g., Sunday, 1. Jun 2025)
        const parsedDateAttempt = parse(scrapedDateText, 'EEEE, d MMM yyyy', new Date());
        if (parsedDateAttempt instanceof Date && !isNaN(parsedDateAttempt.getTime())) {
          dateToParseTimesFor = parsedDateAttempt;
        } else {
          console.warn("Scraped date string \"" + String(scrapedDateText) + "\" was invalid when parsed with 'EEEE, d. MMM yyyy'. Falling back to current server time for parsing prayer times.");
          dateToParseTimesFor = new Date(serverTimeNow); 
          displayGregorianDate = "(Scraped Date Invalid: " + String(scrapedDateText) + ") " + format(serverTimeNow, 'EEEE, d. MMM yyyy');
        }
      } catch (e: any) {
          console.warn("Exception while parsing scraped date string \"" + String(scrapedDateText) + "\": " + String(e.message) + ". Falling back to current server time.");
          dateToParseTimesFor = new Date(serverTimeNow);
          displayGregorianDate = "(Scraped Date Exception) " + format(serverTimeNow, 'EEEE, d. MMM yyyy');
      }
    } else {
      console.warn("No date text found using selector '#gregorianDate'. Using current server time for display and parsing prayer times.");
      dateToParseTimesFor = new Date(serverTimeNow); 
      displayGregorianDate = format(serverTimeNow, 'EEEE, d. MMM yyyy');
    }

    hijriDateDisplay = $('span.mosque-hijri').first().text().trim() || undefined;

    $('div.prayers > div').each((_i, el) => {
      const name = $(el).find('.name').text().trim();
      const timeString = $(el).find('.time > div').first().text().trim(); 

      if (name && timeString) {
        if (!(dateToParseTimesFor instanceof Date) || isNaN(dateToParseTimesFor.getTime())) {
           console.warn("dateToParseTimesFor was invalid before parsing prayer time. Resetting to serverTimeNow.");
           dateToParseTimesFor = new Date(serverTimeNow); 
        }
        const prayerDateTime = parsePrayerTime(timeString, dateToParseTimesFor);
        if (prayerDateTime) {
          rawPrayerTimes.push({
            name,
            time: format(prayerDateTime, 'HH:mm'), 
            dateTime: prayerDateTime,
          });
        }
      }
    });

    if (rawPrayerTimes.length === 0) {
      console.warn('No prayer times were successfully parsed. Page structure might have changed, selector issue, or no times listed on page.');
      if (!htmlContent.includes('prayer')) { 
         return createErrorFallbackData("Failed to find prayer times on the page. Content might be missing or selectors outdated.", serverTimeNow);
      }
    }

    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    let nextPrayerInfo: PrayerTimesData['nextPrayer'] = null;
    let currentPrayerInfo: PrayerTimesData['currentPrayer'] = null;

    if (!(serverTimeNow instanceof Date) || isNaN(serverTimeNow.getTime())) {
        console.error("Critical: serverTimeNow is invalid. This should not happen.");
        return createErrorFallbackData("Internal error with server's current time.", new Date());
    }

    for (let i = 0; i < rawPrayerTimes.length; i++) {
      const prayer = rawPrayerTimes[i];
      if (!prayer || !(prayer.dateTime instanceof Date) || isNaN(prayer.dateTime.getTime())) {
        console.warn("Skipping invalid prayer object or dateTime in prayer list:", prayer);
        continue;
      }

      if (prayer.name !== 'Sunrise') { 
        let nextSalatDateTime: Date | null = null;
        for (let j = i + 1; j < rawPrayerTimes.length; j++) {
            if (rawPrayerTimes[j].name !== 'Sunrise' && rawPrayerTimes[j].dateTime instanceof Date && !isNaN(rawPrayerTimes[j].dateTime.getTime())) {
                nextSalatDateTime = rawPrayerTimes[j].dateTime;
                break;
            }
        }
        const endCurrentPrayerTime = nextSalatDateTime || addMinutes(prayer.dateTime, 150); 

        if (serverTimeNow >= prayer.dateTime && serverTimeNow < endCurrentPrayerTime) {
          currentPrayerInfo = { name: prayer.name, time: prayer.time };
        }
      }

      if (prayer.name !== 'Sunrise' && serverTimeNow < prayer.dateTime && !nextPrayerInfo) { 
        const diffMinutes = differenceInMinutes(prayer.dateTime, serverTimeNow);
        if (diffMinutes >= 0) { 
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
        }
      }
    }

    if (!nextPrayerInfo && rawPrayerTimes.length > 0) {
      const fajrPrayerDefinition = rawPrayerTimes.find(p => p.name === 'Fajr');
      if (fajrPrayerDefinition && fajrPrayerDefinition.dateTime) {
        let fajrForCalculation = fajrPrayerDefinition.dateTime;
        if (serverTimeNow > fajrPrayerDefinition.dateTime) {
          fajrForCalculation = addDays(fajrPrayerDefinition.dateTime, 1);
        }
        
        const diffMinutes = differenceInMinutes(fajrForCalculation, serverTimeNow);

        if (diffMinutes >= 0) { 
          const hoursUntil = Math.floor(diffMinutes / 60);
          const minutesUntil = diffMinutes % 60;
          let timeUntilStr = '';
          if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
          timeUntilStr += `${minutesUntil}m`;
          
          let label = "";
          if (fajrForCalculation.getDate() !== serverTimeNow.getDate()) {
            label = " (tomorrow)";
          }

          nextPrayerInfo = {
            name: fajrPrayerDefinition.name, 
            time: fajrPrayerDefinition.time, 
            dateTime: fajrForCalculation, 
            timeUntil: `${timeUntilStr.trim()}${label}`,
          };
        }
      }
    }
    
    return {
      date: displayGregorianDate,
      hijriDate: hijriDateDisplay,
      times: displayTimes,
      nextPrayer: nextPrayerInfo,
      currentPrayer: currentPrayerInfo,
    };

  } catch (unexpectedError: any) {
    console.error("An unexpected server error occurred in getPrayerTimes:", unexpectedError.message, unexpectedError.stack);
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, new Date());
  } finally {
    if (browser) {
      console.log("Closing Puppeteer browser in finally block.");
      await browser.close();
    }
  }
}
