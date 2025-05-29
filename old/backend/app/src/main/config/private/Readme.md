# Private configuration

This is a place to store deployment-specific files, which should

- not be version controlled
- specific to the instance of VIEW you're running, i.e. whether it's on your
  local machine or your server, or the official server, etc.

Currently, VIEW will look for two files here:

- `firebase-certificate.json` — this file is used by the VIEW server to
  establish its authenticity with the Firebase service
- `local.properties` — an override file for `VIEW.properties`. You will want to
  set the Firebase API keys, endpoints, etc. here, and you may also wish to
  tweak model or executable paths if you're not running in the standard docker
  container.
