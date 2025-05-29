import firebase from 'firebase';
import Storage from '../../../viewWE/Storage';
import FirebaseAdapter from '../../../viewWE/firebaseAdapter';
import view from '../../../viewWE/content_scripts/js/view';

describe("FirebaseAdapter", () => {
  let sandbox;
  let addNotification;
  before(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Displays a notification when firebase throws an error", async () => {
    addNotification = sandbox.stub(view.notification, "add");
    const data = {"some": "data"};
    sandbox.stub(Storage.prototype, "get").resolves(data);
    sandbox.stub(firebase, "initializeApp").throws(new Error("foobar"));
    FirebaseAdapter.firebaseApp = undefined;

    await FirebaseAdapter.initialise({foo: "bar"});

    sinon.assert.calledOnce(addNotification);
  });

  it("Doesn't log a notification on duplicate app error", () => {
    addNotification = sandbox.stub(view.notification, "add");
    const data = {"some": "data"};
    sandbox.stub(Storage.prototype, "get").resolves(data);
    const initializeFirebase = sandbox.stub(firebase, "initializeApp").throws({
      "name": "FirebaseError",
      "code": "app/duplicate app"
    });

    new FirebaseAdapter({foo: "bar"});

    sinon.assert.notCalled(addNotification);
  });

  it("Retrieves the user if its not defined", async () => {
    const token = "a token";
    sandbox.stub(Storage.prototype, "get").resolves({ customToken: token });
    const auth = { "signInWithCustomToken": async token => token + " custom" };
    sandbox.stub(firebase, "auth").returns(auth);

    FirebaseAdapter.user = undefined;
    const result = await FirebaseAdapter.getUser();

    expect(result).to.equal("a token custom");
  });
});
