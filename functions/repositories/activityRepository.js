
class ActivityRepository {

  constructor(db) {
    this.db = db;
  }

  current(uid) {
    const userRef = this.db.collection('users').doc(uid);
    return userRef.get()
      .then(res => {
        const activityInProgress = res.data().activity_in_progress;
        if (!activityInProgress) {
          return null;
        }
        // eslint-disable-next-line promise/no-nesting
        return userRef
            .collection('activities')
            .doc(activityInProgress)
            .get()
            .then(activity => activity.exists ? activity.data() : null)
        }
      );
  }

  getByName(uid, activityName) {
    return this.db.collection('users')
      .doc(uid)
      .collection('activities')
      .get()
      .then(activities => {
        for (let i = 0; i < activities.docs.length; i++) {
          const activity = activities.docs[i];
          const activityData = activity.data();
          if (activityData.name === activityName) {
            activityData.id = activity.id;
            return activityData;
          }
        }
        return null;
      });
  }

  getAll(uid) {
    return this.db.collection('users')
      .doc(uid)
      .collection('activities')
      .get()
      .then(res => res.docs.map(doc => {
        const data = doc.data();
        data.id = doc.id;
        return data;
      }));
  }

  add(uid, activityName) {
    return this.db.collection('users')
      .doc(uid)
      .collection('activities')
      .add({
        name: activityName,
        total_seconds: 0,
        start_time: null
    }).then(activity => activity.id);
  }

  remove(uid, activityId) {
    return this.db.collection('users')
      .doc(uid)
      .collection('activities')
      .doc(activityId)
      .delete();
  }

  start(uid, activityId) {
    const userRef = this.db.collection('users').doc(uid);
    return userRef.set({
      activity_in_progress: activityId
    }, {merge: true})
      .then(() => userRef
        .collection('activities')
        .doc(activityId)
        .set({
          start_time: Date.now()
        }, {merge: true})
      );
  }

  stop(uid, activityId, totalSeconds) {
    const userRef = this.db.collection('users').doc(uid);
    // Stop the activity
    // Remove the in progress activity
    return userRef.set({
      activity_in_progress: null
    }, {merge: true})
      .then(() => userRef.collection('activities')
        .doc(activityId)
        .set({
          start_time: null,
          total_seconds: totalSeconds
        }, {merge: true})
      );
  }
}

module.exports = {ActivityRepository};