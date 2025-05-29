# Client/Server protocol

This could also be seen as the HTTP API documentation of the server component.
All interaction with the server is `ContentEncoding: UTF-8` and `ContentType:
application/json`.

**Note**: Use your firebase session token for all `/act` routes, specified in
the `"token"` parameter.

See the file `TaskAndTrackerAcceptanceTest.java` in the test folder for a
working example. The following text gives a basic rundown of how the API works.

## Requesting a task

`POST` to route `/act/task`

```json
{
    "token": "authtoken",
    "url": "http://example.com",
    "title": "The <title> of the web page",
    "topic": "nouns",
    "activity": "click",
    "language": "ru",
    "filter": "any",
    "timestamp": "000:00:0",
    "number-of-exercises": "123"
}
```

This data is stored in the Database; a task id is generated, and is stored
together with the validated request data. Validation may fail if language,
topic, or activity are invalid.

### Response

The task id, and task data, including the uid. Note that you will never get the
same task id twice, even when you send the exact same request twice, as a
request to `/act/task` always creates a new task.

```json
{
    "user-id": "uid-๓㼎袃깓Τ",
    "task-id": 4,
    "url": "http://example.com",
    "title": "The <title> of the web page",
    "topic": "determiners",
    "activity": "click",
    "language": "en",
    "filter": "any",
    "timestamp": 1490997600000,
    "number-of-exercises": 23
}
```

## User tracking

Track individual user interaction by sending the following data to
`/act/tracking`.

```json
{
    "token": "authtoken",
    "task-id": 234,
    "enhancement-id": "123",
    "submission": "foo",
    "is-correct": "true",
    "correct-answer": "bar",
    "used-solution": "true",
    "sentence": "the context sentence in which the enhancement is placed",
    "timestamp": "213:34:3"
}
```

The `task-id` *must be* a valid task id as requested above with
`/act/task`.

The response is the current performance data for this enhancement.

```json
{
    "enhancement-id": "foo",
    "task-id": 1,
    "correct-answer": "submission",
    "number-of-tries": 2,
    "used-solution": false,
    "sentence": "the context sentence in which the enhancement is placed",
    "assessment": "CORRECT"
}
```

## Retrieving Data

### List all tasks

`GET` route `/act/task` with query parameter `token`, containing your valid
authentification token to retrieve a list of all tasks for this user.

```json
[
  {
    "user-id": "useruid",
    "task-id": 4,
    "url": "http://example.com",
    "title": "The <title> of the web page",
    "topic": "determiners",
    "activity": "click",
    "language": "en",
    "filter": "any",
    "timestamp": 1490997600000,
    "number-of-exercises": 23
  },
  {
    "user-id": "useruid",
    "task-id": 5,
    "url": "http://example.com",
    "title": "The <title> of the web page",
    "topic": "determiners",
    "activity": "click",
    "language": "en",
    "filter": "any",
    "timestamp": 1490997600000,
    "number-of-exercises": 23
  }
]
```

### List all performances for a task

`GET` to `/act/tracking` with query parameters `token` and `task-id` yields a
list of all performances for a task

```json
[
  {
    "enhancement-id": "bar",
    "task-id": 1,
    "correct-answer": "submission",
    "number-of-tries": 1,
    "used-solution": false,
    "sentence": "the context sentence in which the enhancement is placed",
    "assessment": "CORRECT"
  },
  {
    "enhancement-id": "foo",
    "task-id": 1,
    "correct-answer": "submission",
    "number-of-tries": 2,
    "used-solution": false,
    "sentence": "the context sentence in which the enhancement is placed",
    "assessment": "CORRECT"
  }
]
```
