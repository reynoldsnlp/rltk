import firebase from 'firebase';
import view from './content_scripts/js/view';
import Storage from './Storage';

export default class FirebaseAdapter {
  static firebaseApp = undefined;
  static user = undefined;

  static async initialise() {
    if (this.firebaseApp === undefined) {
      try {
        const storage = new Storage();
        const firebaseData = await storage.get('firebaseData');
        this.firebaseApp = firebase.initializeApp(firebaseData.firebaseData);
      } catch (error) {
        // We don't propagate the duplicate app exception, and silently ignore it.
        if (!(error.name === "FirebaseError" && error.code === "app/duplicate app")) {
          view.notification.add("Firebase error: " + error.message);
        }
      }
    }
  }

  static async getToken() {
    await this.initialise();
    const user = await this.getUser();
    const token = await user.getIdToken();

    return token;
  }

  static async getUser() {
    const storage = new Storage();
    if (this.user === undefined) {
      const customToken = await storage.get('customToken');
      const user = await firebase.auth().signInWithCustomToken(customToken.customToken);
      this.user = user;
    }
    return this.user;
  }
}
