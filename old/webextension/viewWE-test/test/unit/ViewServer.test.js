import ViewServer from '../../../viewWE/ViewServer';

describe("ViewServer", () => {
  let requests;
  let xhr;
  const someUrl = "https://example.com";
  const server  = new ViewServer(someUrl);

  beforeEach(() => {
    xhr = sinon.useFakeXMLHttpRequest();
    requests = [];

    global.XMLHttpRequest = xhr;

    xhr.onCreate = function(xhr) {
      requests.push(xhr);
    };
  });

  afterEach(() => {
    xhr.restore();
  });

  it('returns resolved promise', () => {
    const customTokenPromise = server.getCustomToken("token");

    expect(requests.length).to.equal(1);
    expect(requests[0].url).to.equal("https://example.com/user");
    requests[0].respond(
      200,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ "token": "someToken" })
    );

    return customTokenPromise.then(data => {
      expect(data.token).to.equal("someToken");
    });
  });

  it('rejects promise xhr network error', () => {
    const customTokenPromise = server.getCustomToken({ "token": "someToken" });

    requests[0].error();

    return customTokenPromise.then(
      () => sinon.assert.fail("Should not have been resolved"),
      (error) => expect(error.message).to.contain("Network error")
    );
  });

  it('rejects promise on malformed json response', () => {
    const customTokenPromise = server.getCustomToken({ "token": "someToken" });
    requests[0].respond(
      200,
      { 'Content-Type': 'application/json' },
      '{ "error": "This is an error }'
    );

    return customTokenPromise.then(
      () => sinon.assert.fail("Should not have been resolved"),
      (error) => {}
    );
  });

  it('rejects promise on non-200 response', () => {
    const customTokenPromise = server.getCustomToken({ "token": "someToken" });
    requests[0].respond(
      400,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ "error": "This is an error" })
    );

    return customTokenPromise.then(
      () => sinon.assert.fail("Should not have been resolved"),
      (error) => {
        expect(error.message).to.contain(400);
      }
    );
  });
});
