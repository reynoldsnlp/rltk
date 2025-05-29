# VIEW ― a Platform for ICALL Systems

[![build status](https://git.aleks.bg/view/view/badges/master/build.svg)](https://git.aleks.bg/view/view/commits/master)

VIEW is a web platform for second language learners and programmers interested
in providing functionality for second language learning assistance. It is
capable of retrieving documents from web sites and then annotating their
linguistic structure to help the learner. The web content can then be marked up
in a modular way and the enhanced content exposed to the user through an
interactive interface. This should ultimately allow the learner to understand
the underlying principles of the target language, and thus acquire a firmer
grasp of the language itself.

## Architecture
The system currently only supports English, German, and Spanish as target
languages, but is highly modular and thus extensible towards other languages.

VIEW is confirmed to run on a Tomcat web server and relies on a recent JVM
(version 1.8). The basic architecture relies on the Servlets API and the
Apache UIMA API.

## Layout of this repository

The root directory contains documentation (`docs`), specifications for
docker-containers (`tomcat`) and a [docker-compose](https://docs.docker.com/compose/)
configuration (`docker-compose.yml`) to start VIEW on your platform without having
to install anything (except [docker](https://docker.com).)

The project can be built using maven. Dependencies that are not available in
Maven Central are available in the `dependencies` folder. Simply issue `make` in
said folder to register external dependencies with your local Maven cache. The
java source is in the `app` folder, where you can build the project if you have
previously downloaded the external dependencies.

## History

VIEW started as WERTi (Working with English Real Texts interactively) in 2006
and was originally written in Python. The idea was ported to Java & Uima in
2008, and the resulting software has since been under development. It was
re-christened VIEW after beginning to support multiple languages. A companion
Firefox plugin, which was the recommended way of using VIEW for a while, has
since been discontinued, due to changes in Firefox' Plugin-API and the desire to
stay browser-independent.

This current version is a major rewrite of the core server components in order
to facilitate further extensions to the system, and make it more robust. A
version still maintained by the Seminar für Sprachwissenschaft in the University
of Tübingen is available [here](http://sifnos.sfs.uni-tuebingen.de/VIEW/).

## Contact

This version of the system is currently under development
by [Aleksandar Dimitrov](mailto:aleks.dimitrov@gmail.com) and
[Eduard Schaf](mailto:eduard.schaf@student.uni-tuebingen.de)

The source repository is [available on git](https://git.aleks.bg/view/view), and
there is an [issue tracker in the repository](https://git.aleks.bg/view/view/issues).
You can check out the source, but unfortunately, automatic signups are currently
disabled. If you wish to file an issue or contribute to the repository,
please [contact me](mailto:aleks.dimitrov@gmail.com).

## Requirements
* Docker
* Maven 2, Java 8
* [Git LFS](https://git-lfs.github.com/)
* [Vislcg3 and cg-conv](http://beta.visl.sdu.dk/cg3/chunked/installation.html)

## Instructions for Installation and Development

The following should get you started:

```
cd dependencies
make
cd ../app
mvn compile war:exploded
cd ..
docker-compose up -d
docker-compose logs -f
```

**Note:** if your user is not part of the `docker` group, but part of `sudoers`
or `wheel` you have to prefix `docker-compose` calls with `sudo`. If your user
is in none of these groups, you have to execute the `docker-compose` commands
as `root`.

The application should be available under `http://localhost:8080`, and, if you
have a docker [nginx-proxy set up](https://hub.docker.com/r/jwilder/nginx-proxy/),
under `http://view.localhost`.

Make sure to define the local location of your files in 
`view/app/src/main/config/local.properties`

when they are different to the ones listed in
`view/app/src/main/config/VIEW.properties`.

Once all tests pass, you should be ready to start!

## Troubleshooting

Please see our [troubleshooting guide](docs/troubleshooting.md)

