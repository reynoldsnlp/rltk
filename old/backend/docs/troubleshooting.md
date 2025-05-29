# VIEW local Docker client

The local docker client can be started via
the [`docker-compose.yml`](/docker-compose.yml) in the root directory.
You can issue `docker-compose up -d` from anywhere in the project to start it.

## Getting logs

If you've started the server via `docker-compose up -d`, you can access the logs
with `docker-compose logs`.
If there's too much noise, try `docker-compose logs --tail 50 -f`, which will
show only the last 50 lines.

If you're trying to debug problems during startup, it can be beneficial to use
`docker-compose up` instead to immediately see the logs.
Use `CTRL-C` to exit.

## The server always responds with 404

This means the application failed during startup. There should be a logged
exception, see above on getting logs.
See below for some issues that might cause the server to fail to come up.

### Database checksum mismatch

Symptom: you see an exception like the following in the logs:

```
tomcat_1  | 07-Jun-2017 22:28:45.110 SEVERE [localhost-startStop-1]
org.apache.catalina.core.StandardContext.listenerStart Exception sending
context initialized event to listener instance of class
[werti.server.ViewContextListener]
tomcat_1  |  org.flywaydb.core.api.FlywayException: Validate failed: Migration checksum mismatch for migration 0001
tomcat_1  | -> Applied to database : -6459787
tomcat_1  | -> Resolved locally    : 1610493687
tomcat_1  | at org.flywaydb.core.Flyway.doValidate(Flyway.java:1024)
tomcat_1  | at org.flywaydb.core.Flyway.access$100(Flyway.java:72)
tomcat_1  | at org.flywaydb.core.Flyway$1.execute(Flyway.java:934)
tomcat_1  | at org.flywaydb.core.Flyway$1.execute(Flyway.java:930)
tomcat_1  | at org.flywaydb.core.Flyway.execute(Flyway.java:1413)
tomcat_1  | at org.flywaydb.core.Flyway.migrate(Flyway.java:930)
tomcat_1  | at …

```

This means the database migrations changed, and your local database is out of
sync.
Since we're still working on the final db layout, the migrations are not yet
stable.
The db in your local server is saved as
a [docker volume](https://docs.docker.com/engine/tutorials/dockervolumes/).
You can delete it using `docker-compose down -v`, then restart the service.
**This deletes all data in the database.**

## Port already in use

The service expects port `8080` to be available.
If that is not the case on your machine, you will see an error like the
following after using `docker-compose up`:

```
Creating view_tomcat_1 ...
Creating view_tomcat_1 ... error

ERROR: for view_tomcat_1  Cannot start service tomcat: driver failed programming external connectivity on endpoint view_tomcat_1 (33ef2e5f565d75672cdb51bc1322573e38a00a5e130785aaab16ddd5ad67a5bd): Bind for 0.0.0.0:8080 failed: port is already allocated

ERROR: for tomcat  Cannot start service tomcat: driver failed programming external connectivity on endpoint view_tomcat_1 (33ef2e5f565d75672cdb51bc1322573e38a00a5e130785aaab16ddd5ad67a5bd): Bind for 0.0.0.0:8080 failed: port is already allocated
ERROR: Encountered errors while bringing up the project.
```

Note the message "port is already allocated."
You can avoid this by freeing up port 8080, or by changing the `ports` entry in
the `docker-compose yml` to read, say `9999:8080` where `9999` is any port you
choose (that is free on your machine.)
However, the VIEW addon expects the localhost server to be available under port 8080.
You will have to change the port number there, too, if you want to use the
addon, or use
the [docker nginx reverse proxy](https://github.com/jwilder/nginx-proxy), and
select `view.localhost` in the addon.


## Other Problems

Please write to [Aleks](mailto:aleks.dimitrov@gmail.com) if there are other problems during startup.
Be sure to include the logs.
