const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { secondsToTimePhrase, sessionSeconds } = require('./utils');
const {dialogflow, SignIn} = require('actions-on-google');
const app = dialogflow({
  debug: true,
  clientId: functions.config().profilr.id
});

admin.initializeApp(functions.config().firebase);
const auth = admin.auth();

const db = admin.firestore();


app.intent('Welcome Intent', (conv) => {
  conv.ask(new SignIn('In order to save your Profile'))
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
  conv.ask(`Hi ${conv.user.profile.payload.name}! What are you up to?`);
});

app.intent('Add Activity', async (conv, {activity_name}) => {
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (activity.exists) {
    conv.ask(`${activity_name} is already an activity in your Profile`);
    return
  }
  await activityRef.set({
    total_seconds: 0,
    start_time: null
  });
  conv.ask(`Successfully added a new activity called: ${activity_name}`);
});

// Remove Activity

app.intent('Remove Activity', async (conv, {activity_name}) => {
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (!activity.exists) {
    conv.ask(`${activity_name} is not an activity in your Profile`);
    return
  }
  conv.data.activity_name = activity_name;
  conv.ask(`Are you sure you wish to remove ${activity_name} from your profiled activities?`);
});

app.intent('Remove Activity - yes', async (conv) => {
  const activity_name = conv.data.activity_name;
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  await activityRef.delete();
  conv.ask(`Successfully removed ${activity_name} from your activities.`);
});

app.intent('Remove Activity - no', async (conv) => {
  conv.ask(`Ok.`);
});

app.intent('List Activities', async (conv) => {
  const activities = await db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').get();
  conv.ask(`Your profiled activities are: ${activities.docs.map(doc => doc.id)}`);
});

app.intent('Current Activity', async (conv) => {
  const userRef = await db.collection('users')
    .doc(conv.data.uid).get();
  const activity = userRef.data().activity_in_progress;
  if (!activity) {
    conv.ask('You have no activity in progress.');
    return;
  }
  conv.ask(`You are currently ${activity}.`);
});

app.intent('Full Profile', async (conv) => {
  const activities = await db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').get();
  const activitiesPhrase = activities.docs.map(doc => `${secondsToTimePhrase(doc.data().total_seconds)} ${doc.id}`);
  conv.ask(`Your profile is as follows. You have spent ${activitiesPhrase}`);
});

// Start Activity

app.intent('Start Activity', async (conv, {activity_name}) => {
  const userRef = db.collection('users').doc(conv.data.uid);

  // Check if any activity is already started
  const startActivity = await userRef.get();
  const existingActivity = startActivity.data().activity_in_progress;
  if (existingActivity){
    conv.ask(`${existingActivity} is already in progress.`);
    return;
  }
  // Get the activity to start
  const activityRef = userRef.collection('activities').doc(activity_name);
  const activity = await activityRef.get();

  if (!activity.exists) {
    conv.followup('start_activity_add_activity', {
      activity_name: activity_name
    });
    return;
  }
  // Set activity to start
  await userRef.set({
    activity_in_progress: activity_name
  }, {merge: true});

  // Start timing the activity
  await activityRef.set({
    start_time: Date.now()
  }, {merge: true});
  conv.ask(`Started profiling activity: ${activity_name}`);
});

app.intent('Start Activity - add Activity', (conv, {activity_name}) => {
  conv.data.activity_name = activity_name;
  conv.ask(`${activity_name} is not an activity in your Profile. Would you like me to add it to your Profile?`);
});

app.intent('Start Activity - add Activity - yes', async (conv) => {
  const activity_name = conv.data.activity_name;
  const userRef = db.collection('users').doc(conv.data.uid);
  // Set activity to start
  await userRef.set({
    activity_in_progress: activity_name
  }, {merge: true});
  // Get the activity to start
  const activityRef = userRef.collection('activities').doc(activity_name);
  // Start timing the activity
  await activityRef.set({
    start_time: Date.now(),
    total_seconds: 0
  });
  conv.ask(`Started profiling new activity: ${activity_name}`);
});

app.intent('Start Activity - add Activity - no', async (conv) => {
  conv.ask(`Ok.`);
});



app.intent('Stop Activity', async (conv, {activity_name}) => {
  const userRef = db.collection('users').doc(conv.data.uid);

  // Check the activity has been started (and no other has been)
  const startActivity = await userRef.get();
  const existingActivity = startActivity.data().activity_in_progress;
  if (!existingActivity) {
    conv.ask('There is no activity in progress.');
    return;
  } else if (existingActivity !== activity_name){
    conv.ask(`A different activity is in progress: ${existingActivity}.`);
    return;
  }

  // Get the activity to stop
  const activityRef = userRef.collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (!activity.exists) {
    conv.ask(`${activity_name} is not an activity in your Profile`);
    return;
  }
  const activityData = activity.data();

  const seconds = sessionSeconds(activityData);
  const totalSeconds = activityData.total_seconds + seconds;

  // Stop the activity
  // Remove the in progress activity
  await userRef.set({
    activity_in_progress: null
  }, {merge: true});

  // Set the new time profile for the activity
  await activityRef.set({
    start_time: null,
    total_seconds: totalSeconds
  }, {merge: true});

  conv.ask(`You spent ${secondsToTimePhrase(seconds)} ${activity_name}`);
});

app.intent('How Long Have I Spent', async (conv, {activity_name}) => {
  const activityRef = db.collection('users')
    .doc(conv.data.uid)
    .collection('activities').doc(activity_name);
  const activity = await activityRef.get();
  if (!activity.exists) {
    conv.ask(`${activity_name} is not an activity in your Profile`);
    return
  }
  const activityData = activity.data();
  const seconds = activityData.total_seconds + sessionSeconds(activityData);
  conv.ask(`You have spent a total of ${secondsToTimePhrase(seconds)} ${activity_name}`);
});

exports.profilrFulfillment = functions.https.onRequest(app);