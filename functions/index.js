const admin = require("firebase-admin");
const functions = require('firebase-functions');
const {dialogflow} = require('actions-on-google');
const app = dialogflow({ debug: true });

admin.initializeApp(functions.config().firebase);

let db = admin.firestore();


app.intent('Add Time Sink', async (conv, {task_name}) => {
  let collectionRef = db.collection('time_sinks');
  await collectionRef.add({
    name: task_name,
    total_seconds: 0,
    start_time: null
  });
  conv.ask(`Successfully added the new time sink: ${task_name}`);
});

app.intent('List Time Sinks', async (conv) => {
  const timeSinks = await db.collection('time_sinks').get();
  const names = timeSinks.docs.map(doc => doc.data().name);
  conv.ask(`Here are your time sinks: ${names}`);
});

app.intent('Start Time Sink', async (conv, {task_name}) => {
  const timeSinks = await db.collection('time_sinks').where('name', '==', task_name).limit(1).get();
  if (timeSinks.empty) {
    conv.ask(`No time sink named: ${task_name}`);
    return;
  }
  const timeSink = timeSinks.docs[0];
  const timeSinkRef = timeSink.ref;
  await timeSinkRef.set({
    start_time: Date.now()
  }, {merge: true});
  conv.ask(`Started time sink: ${task_name}`);
});

app.intent('Stop Time Sink', async (conv, {task_name}) => {
  const timeSinks = await db.collection('time_sinks').where('name', '==', task_name).limit(1).get();
  if (timeSinks.empty) {
    conv.ask(`No time sink named: ${task_name}`);
    return;
  }
  const timeSink = timeSinks.docs[0];
  const timeSinkRef = timeSink.ref;
  const startTime = timeSink.data().start_time;
  const totalSeconds = timeSink.data().total_seconds;
  if (startTime === null) {
    conv.ask(`You had not started the task: ${task_name}`);
    return;
  }
  const sessionSeconds = Math.floor((Date.now() - startTime) /1000);
  const seconds = totalSeconds + sessionSeconds;
  await timeSinkRef.set({
    start_time: null,
    total_seconds: seconds
  }, {merge: true});
  conv.ask(`You spent ${secondsToTimePhrase(sessionSeconds)} ${task_name}`);
});

app.intent('How Long Have I Spent', async (conv, {task_name}) => {
  const timeSinks = await db.collection('time_sinks').where('name', '==', task_name).limit(1).get();
  if (timeSinks.empty) {
    conv.ask(`No time sink named: ${task_name}`);
    return;
  }
  const seconds = timeSinks.docs[0].data().total_seconds;
  conv.ask(`You have spent a total of ${secondsToTimePhrase(seconds)} ${task_name}`);
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



exports.timeSinksFulfillment = functions.https.onRequest(app);