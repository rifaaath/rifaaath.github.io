
'use server';

import { format, addMinutes, differenceInMinutes, parse, set, addDays } from 'date-fns';
import * as cheerio from 'cheerio';

export interface PrayerTime {
  name: string;
  time: string; // Display time (e.g., 01:15 PM or 13:15)
  dateTime: Date; // Full Date object for comparisons
}

export interface PrayerTimesData {
  date: string;
  hijriDate?: string;
  times: { name: string; time: string }[];
  nextPrayer: {
    name: string;
    time: string;
    timeUntil: string;
    isCurrent: boolean;
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
    console.warn(`parsePrayerTime: Received empty or null time string.`);
    return null;
  }
  if (!(baseDate instanceof Date) || isNaN(baseDate.getTime())) {
    console.warn(`parsePrayerTime: Received invalid baseDate: ${baseDate}. Cannot parse time "${timeStr}".`);
    return null;
  }

  const [timePart, modifier] = timeStr.split(' ');

  if (!timePart || !timePart.includes(':')) {
    console.warn(`parsePrayerTime: Invalid time string format (missing ':' or empty timePart): "${timeStr}"`);
    return null;
  }

  const [hoursStr, minutesStr] = timePart.split(':');

  if (!hoursStr || minutesStr === undefined) {
    console.warn(`parsePrayerTime: Invalid time components for: "${timeStr}" (hoursStr: ${hoursStr}, minutesStr: ${minutesStr})`);
    return null;
  }

  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);

  if (isNaN(hours) || isNaN(minutes)) {
    console.warn(`parsePrayerTime: Failed to parse hour/minute numbers for: "${timeStr}" (parsed hours=${hours}, parsed minutes=${minutes})`);
    return null;
  }

  if (modifier) { // 12-hour format with AM/PM (primarily for fallback, site uses 24h)
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
      console.warn(`parsePrayerTime: Hour/minute out of range for 12h format: "${timeStr}"`);
      return null;
    }
    if (modifier.toUpperCase() === 'PM' && hours < 12) {
      hours += 12;
    }
    if (modifier.toUpperCase() === 'AM' && hours === 12) { // Midnight case e.g. 12:30 AM should be 00:30
      hours = 0;
    }
  } else { // 24-hour format
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.warn(`parsePrayerTime: Hour/minute out of range for 24h format: "${timeStr}" (hours=${hours}, minutes=${minutes})`);
      return null;
    }
  }
  try {
    return set(baseDate, { hours, minutes, seconds: 0, milliseconds: 0 });
  } catch (e) {
    console.error(`parsePrayerTime: Error calling 'set' for baseDate: ${baseDate}, hours: ${hours}, minutes: ${minutes}`, e);
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
    displayDate = format(validFallbackDate, 'EEEE, MMMM d, yyyy');
  } catch (e) {
    console.error("Error formatting date in createErrorFallbackData:", e);
    displayDate = "Date Unavailable (Formatting Error)";
  }

  // Fallback times if scraping fails, using 24-hour format internally then formatting for display
  const fallbackTimesRawInfo = [
    { name: 'Fajr', timeStr: '03:30' }, { name: 'Sunrise', timeStr: '05:30' },
    { name: 'Dhuhr', timeStr: '13:15' }, { name: 'Asr', timeStr: '17:30' },
    { name: 'Maghrib', timeStr: '21:15' }, { name: 'Isha', timeStr: '22:45' },
  ];
  const fallbackDisplayTimes: { name: string; time: string }[] = [];
  fallbackTimesRawInfo.forEach(ft => {
    const dt = parsePrayerTime(ft.timeStr, validFallbackDate); // Use validFallbackDate
    if (dt) {
      fallbackDisplayTimes.push({ name: ft.name, time: format(dt, 'HH:mm') }); // Display in 24h
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
  const serverTimeNow = new Date(); // Primary "now" reference

  try {
    // --- Stage 1: Fetch and Parse Live Data ---
    let rawPrayerTimes: PrayerTime[] = [];
    let displayGregorianDate: string;
    let hijriDateDisplay: string | undefined;
    let dateToParseTimesFor: Date = serverTimeNow; // Default to server's current date for parsing prayers

    try {
      const response = await fetch(MAWAQIT_URL, { next: { revalidate: 3600 } }); // Revalidate every hour
      if (!response.ok) {
        throw new Error(`Failed to fetch Mawaqit page: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      const scrapedDateText = $('span.mosque-date').first().text().trim();
      if (scrapedDateText) {
        displayGregorianDate = scrapedDateText; // Keep original for display
        try {
          // Use new Date() as the reference date for parsing, not serverTimeNow directly if it's old
          const parsedDateAttempt = parse(scrapedDateText, 'EEEE, MMMM d, yyyy', new Date());
          if (parsedDateAttempt instanceof Date && !isNaN(parsedDateAttempt.getTime())) {
            dateToParseTimesFor = parsedDateAttempt;
          } else {
            console.error(`Failed to parse scraped date: "${scrapedDateText}". Falling back to server's current date for prayer time parsing.`);
            displayGregorianDate = `(Scraped Date Invalid: ${scrapedDateText}) ${format(serverTimeNow, 'EEEE, MMMM d, yyyy')}`;
            // dateToParseTimesFor remains serverTimeNow
          }
        } catch (e: any) {
            console.error(`Exception during scraped date parsing for "${scrapedDateText}": ${e.message}. Falling back.`);
            displayGregorianDate = `(Scraped Date Exception) ${format(serverTimeNow, 'EEEE, MMMM d, yyyy')}`;
            // dateToParseTimesFor remains serverTimeNow
        }
      } else {
        console.warn("Scraped date string is empty. Falling back to server's current date.");
        displayGregorianDate = format(serverTimeNow, 'EEEE, MMMM d, yyyy');
        // dateToParseTimesFor remains serverTimeNow
      }

      hijriDateDisplay = $('span.mosque-hijri').first().text().trim() || undefined;

      $('div.prayers > div').each((_i, el) => {
        const name = $(el).find('.name').text().trim();
        const timeString = $(el).find('.time > div').text().trim(); // Expects 24-hour like "13:19"

        if (name && timeString) {
          if (!(dateToParseTimesFor instanceof Date) || isNaN(dateToParseTimesFor.getTime())) {
             console.error(`CRITICAL: dateToParseTimesFor is invalid before parsing prayer "${name}". Using fresh server time.`);
             dateToParseTimesFor = new Date(); // Recovery attempt
          }
          const prayerDateTime = parsePrayerTime(timeString, dateToParseTimesFor);
          if (prayerDateTime) {
            rawPrayerTimes.push({
              name,
              time: format(prayerDateTime, 'HH:mm'), // Store/display in 24h format
              dateTime: prayerDateTime,
            });
          } else {
            console.warn(`Skipping prayer entry (parsePrayerTime returned null): ${name} - ${timeString} on ${format(dateToParseTimesFor, 'yyyy-MM-dd')}`);
          }
        }
      });

      if (rawPrayerTimes.length === 0) {
        console.warn('No prayer times were successfully parsed from Mawaqit. Page structure might have changed or no times listed.');
        // This isn't necessarily a full error for createErrorFallbackData, but calculations might yield nulls.
        // The UI should gracefully handle empty times.
      }

    } catch (fetchParseError: any) {
      console.error("Error during fetching/parsing Mawaqit data:", fetchParseError.message, fetchParseError.stack);
      return createErrorFallbackData(`Failed to load live prayer data: ${fetchParseError.message}. Using fallback.`, serverTimeNow);
    }

    // --- Stage 2: Calculate Current/Next Prayer ---
    const displayTimes = rawPrayerTimes.map(pt => ({ name: pt.name, time: pt.time }));
    let nextPrayerInfo: PrayerTimesData['nextPrayer'] = null;
    let currentPrayerInfo: PrayerTimesData['currentPrayer'] = null;

    if (!(serverTimeNow instanceof Date) || isNaN(serverTimeNow.getTime())) {
        console.error("CRITICAL: serverTimeNow is invalid before calculations. This should not occur.");
        return createErrorFallbackData("Internal error with server's current time.", new Date());
    }

    for (let i = 0; i < rawPrayerTimes.length; i++) {
      const prayer = rawPrayerTimes[i];
      if (!prayer || !(prayer.dateTime instanceof Date) || isNaN(prayer.dateTime.getTime())) {
        console.warn(`Skipping invalid prayer object in current/next calculation: ${JSON.stringify(prayer)}`);
        continue;
      }

      // Determine current prayer (excluding Sunrise)
      if (prayer.name !== 'Sunrise') {
        // A prayer is "current" from its start time until the start of the *next actual salat*
        // Find next prayer that isn't Sunrise
        let nextSalatDateTime: Date | null = null;
        for (let j = i + 1; j < rawPrayerTimes.length; j++) {
            if (rawPrayerTimes[j].name !== 'Sunrise' && rawPrayerTimes[j].dateTime instanceof Date && !isNaN(rawPrayerTimes[j].dateTime.getTime())) {
                nextSalatDateTime = rawPrayerTimes[j].dateTime;
                break;
            }
        }
        // If Isha is current, it remains current for a long time (e.g. until Fajr next day)
        // For simplicity, let's give it a window like other prayers or until a theoretical "next Fajr".
        // A more robust solution for Isha would involve Fajr of the next day.
        const endCurrentPrayerTime = nextSalatDateTime || addMinutes(prayer.dateTime, 150); // Fallback: 2.5 hours

        if (serverTimeNow >= prayer.dateTime && serverTimeNow < endCurrentPrayerTime) {
          currentPrayerInfo = { name: prayer.name, time: prayer.time };
        }
      }

      // Determine next prayer
      if (serverTimeNow < prayer.dateTime && !nextPrayerInfo) {
        const diffMinutes = differenceInMinutes(prayer.dateTime, serverTimeNow);
        // diffMinutes can be negative if a prayer time has passed but loop continues.
        // We only care about future prayers for "nextPrayerInfo".
        if (diffMinutes >= 0) {
            const hoursUntil = Math.floor(diffMinutes / 60);
            const minutesUntil = diffMinutes % 60;
            let timeUntilStr = '';
            if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
            timeUntilStr += `${minutesUntil}m`;

            nextPrayerInfo = {
                name: prayer.name,
                time: prayer.time,
                timeUntil: `in ${timeUntilStr}`,
                isCurrent: false,
            };
        }
      }
    }

    // If all prayers for today have passed, next prayer is Fajr tomorrow
    if (!nextPrayerInfo && rawPrayerTimes.length > 0) {
      const fajrPrayerToday = rawPrayerTimes.find(p => p.name === 'Fajr' && p.dateTime instanceof Date && !isNaN(p.dateTime.getTime()));
      if (fajrPrayerToday && fajrPrayerToday.dateTime) {
        const fajrTomorrowDateTime = addDays(fajrPrayerToday.dateTime, 1);
        const diffMinutes = differenceInMinutes(fajrTomorrowDateTime, serverTimeNow);

        if (diffMinutes >= 0) { // Ensure Fajr tomorrow is indeed in the future
          const hoursUntil = Math.floor(diffMinutes / 60);
          const minutesUntil = diffMinutes % 60;
          let timeUntilStr = '';
          if (hoursUntil > 0) timeUntilStr += `${hoursUntil}h `;
          timeUntilStr += `${minutesUntil}m`;

          nextPrayerInfo = {
            name: fajrPrayerToday.name,
            time: fajrPrayerToday.time, // Display time of Fajr
            timeUntil: `in ${timeUntilStr} (tomorrow)`,
            isCurrent: false,
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
      // error: undefined (success)
    };

  } catch (unexpectedError: any) {
    console.error("CRITICAL UNHANDLED ERROR in getPrayerTimes main processing:", unexpectedError.message, unexpectedError.stack);
    // Use a fresh new Date() for the fallback in case serverTimeNow was compromised or very old.
    return createErrorFallbackData(`An unexpected server error occurred: ${unexpectedError.message}`, new Date());
  }
}

    