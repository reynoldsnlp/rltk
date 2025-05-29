- Added `gulp` and `webpack` to compile `.scss` and `.js` files into bundles and
  handle html templates
- Added new interface based on [foundation](https://foundation.zurb.com)
- Added guice for dependency injection
- Removed JSP and added Mustache templates
- Introduced Unit Tests for Lingpipe and some OpenNLP classes
- Deployment target is now to web root, not `/VIEW`
- Deprecated `WERTiContext` — replaced by `VIEWContext` and `AbstractViewModel`
- Updated lots of dependencies and removed SFS repository from `pom.xml`
  in favor of `dependencies/Makefile`
- Introduced docker container for Tomcat, use Tomcat 8.5
- Updated source version to JDK 8
