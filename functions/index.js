const functions = require('firebase-functions');
const {dialogflow} = require('actions-on-google');
const app = dialogflow({ debug: true });

app.intent('Welcome Intent', async (conv) => {
  if (conv.user.storage.activities) {
    conv.ask("Hi again! How can I help?");
  } else {
    conv.ask("Hi. I am Profiler, why don't you ask me to start profiling a new activity?")
    conv.user.storage.activities = [];
  }
});

app.intent('Add Activity', async (conv, {activity_name}) => {
  conv.user.storage.activities.push({
    name: activity_name,
    total_seconds: 0,
    start_time: null
  });
  conv.ask(`Successfully added a new activity called: ${activity_name}`);
});

app.intent('List Activities', async (conv) => {
  const names = conv.user.storage.activities.map(doc => doc.data().name);
  conv.ask(`Your profiled activities are: ${names}`);
});

app.intent('Start Activity', async (conv, {activity_name}) => {
  if (!(activity_name in conv.user.storage.activities)) {
    conv.ask(`No activity named ${activity_name}`);
  }
  conv.user.storage.activities[activity_name].start_time = Date.now();
  conv.ask(`Started profiling activity: ${activity_name}`);
});

app.intent('Stop Activity', async (conv, {activity_name}) => {
  const activities = conv.user.storage.activities;
  if (!(activity_name in activities)) {
    conv.ask(`No activity named ${activity_name}`);
  }
  const activity = activities[activity_name];
  const startTime = activity.start_time;
  const totalSeconds = activity.total_seconds;
  if (startTime === null) {
    conv.ask(`You have not started ${activity_name} yet.`);
    return;
  }
  const sessionSeconds = Math.floor((Date.now() - startTime) /1000);
  const seconds = totalSeconds + sessionSeconds;
  conv.user.storage.activities[activity_name].start_time = null;
  conv.user.storage.activities[activity_name].total_seconds = seconds;
  conv.ask(`You spent ${secondsToTimePhrase(sessionSeconds)} ${activity_name}`);
});

app.intent('How Long Have I Spent', async (conv, {activity_name}) => {
  const activities = conv.user.storage.activities;
  if (!(activity_name in activities)) {
    conv.ask(`No activity named ${activity_name}`);
  }
  const seconds = activities[activity_name].total_seconds;
  conv.ask(`You have spent a total of ${secondsToTimePhrase(seconds)} ${activity_name}`);
});

const secondsToTimePhrase = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  let phrase = "";
  if (minutes !== 0) {
    const plural = minutes === 1 ? '' : 's';
    phrase += `${minutes} minute${plural} and `;
  }
  phrase += `${remainderSeconds} seconds`;
  return phrase;
};



exports.profilrFulfillment = functions.https.onRequest(app);