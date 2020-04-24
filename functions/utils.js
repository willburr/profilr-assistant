const MILLISECONDS_IN_SECONDS = 1000;
const SECONDS_IN_HOUR = 3600;
const SECONDS_IN_MINUTE = 60;

const secondsToTimePhrase = (seconds) => {
  // Compute number of hours
  const hours = Math.floor(seconds / SECONDS_IN_HOUR);
  let secondsRemaining = seconds % SECONDS_IN_HOUR;

  // Compute number of minutes and remaining seconds
  const minutes = Math.floor(secondsRemaining / SECONDS_IN_MINUTE);
  secondsRemaining = secondsRemaining % SECONDS_IN_MINUTE;

  // Build time phrase
  let phrase = "";
  if (hours !== 0) {
    const plural = hours === 1 ? '' : 's';
    phrase += `${hours}  hour${plural} and `;
  }
  if (minutes !== 0) {
    const plural = minutes === 1 ? '' : 's';
    phrase += `${minutes} minute${plural} and `;
  }

  const plural = secondsRemaining === 1 ? '' : 's';
  phrase += `${secondsRemaining} second${plural}`;
  return phrase;
};


const sessionSeconds = (activity) => {
  const startTime = activity.start_time;
  let seconds = 0;
  if (startTime) {
    seconds = Math.floor((Date.now() - startTime) / MILLISECONDS_IN_SECONDS);
  }
  return seconds;
};

module.exports = { secondsToTimePhrase, sessionSeconds };