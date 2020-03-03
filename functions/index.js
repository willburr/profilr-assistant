const admin = require("firebase-admin");
const functions = require('firebase-functions');
const {dialogflow, SignIn} = require('actions-on-google');
const app = dialogflow({
  debug: true,
  clientId: process.env.CLIENT_ID
});

admin.initializeApp(functions.config().firebase);
const auth = admin.auth();

let db = admin.firestore();

// Retrieve the user's favorite color if an account exists, ask if it doesn't.
app.intent('Welcome Intent', async (conv) => {
  if (conv.user.verification !== 'VERIFIED') {
    conv.close(`Hi! You'll need to be a verified user to use this sample`);
    return;
  }
  conv.ask(new SignIn('In order to save your Profile'));
});

app.intent('Get Signin', async (conv, params, signin) => {
  if (signin.status !== 'OK') {
    conv.close(`Let's try again next time.`);
    return;
  }
  const {email} = conv.user;
  if (!conv.data.uid && email) {
    try {
      conv.data.uid = (await auth.getUserByEmail(email)).uid;
    } catch (e) {
      if (e.code !== 'auth/user-not-found') {
        throw e;
      }
      // If the user is not found, create a new Firebase auth user
      // using the email obtained from the Google Assistant
      conv.data.uid = (await auth.createUser({email})).uid;
    }
  }
  if (conv.data.uid) {
    conv.user.ref = db.collection('users').doc(conv.data.uid);
  }
});

app.intent('Add Activity', async (conv, {activity_name}) => {
  let collectionRef = db.collection('activities');
  await collectionRef.add({
    name: activity_name,
    total_seconds: 0,
    start_time: null
  });
  conv.ask(`Successfully added a new activity called: ${activity_name}`);
});

app.intent('List Activities', async (conv) => {
  const activities = await db.collection('activities').get();
  const names = activities.docs.map(doc => doc.data().name);
  conv.ask(`Your profiled activities are: ${names}`);
});

app.intent('Start Activity', async (conv, {activity_name}) => {
  const activities = await db.collection('activities').where('name', '==', activity_name).limit(1).get();
  if (activities.empty) {
    conv.ask(`No activity named: ${activity_name}`);
    return;
  }
  const timeSink = activities.docs[0];
  const timeSinkRef = timeSink.ref;
  await timeSinkRef.set({
    start_time: Date.now()
  }, {merge: true});
  conv.ask(`Started profiling activity: ${activity_name}`);
});

app.intent('Stop Activity', async (conv, {activity_name}) => {
  const activities = await db.collection('activities').where('name', '==', activity_name).limit(1).get();
  if (activities.empty) {
    conv.ask(`No activity named: ${activity_name}`);
    return;
  }
  const activity = activities.docs[0];
  const startTime = activity.data().start_time;
  const totalSeconds = activity.data().total_seconds;
  if (startTime === null) {
    conv.ask(`You have not started ${activity_name} yet.`);
    return;
  }
  const sessionSeconds = Math.floor((Date.now() - startTime) /1000);
  const seconds = totalSeconds + sessionSeconds;
  await activity.ref.set({
    start_time: null,
    total_seconds: seconds
  }, {merge: true});
  conv.ask(`You spent ${secondsToTimePhrase(sessionSeconds)} ${activity_name}`);
});

app.intent('How Long Have I Spent', async (conv, {activity_name}) => {
  const activities = await db.collection('activities').where('name', '==', activity_name).limit(1).get();
  if (activities.empty) {
    conv.ask(`No activity named: ${activity_name}`);
    return;
  }
  const seconds = activities.docs[0].data().total_seconds;
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