lingpipe    := lingpipe-4.1.0.jar

.PHONY: mvn
mvn: $(lingpipe)
	mvn install:install-file -Dpackaging=jar \
	-Dfile=$(lingpipe) \
	-DartifactId=lingpipe \
	-DgroupId=com.aliasi \
	-Dversion=4.1.0

$(lingpipe):
	curl -LO 'http://lingpipe-download.s3.amazonaws.com/lingpipe-4.1.0.tar.gz'
	tar xf lingpipe-4.1.0.tar.gz
	cp lingpipe-4.1.0/$(lingpipe) .
	rm -rf lingpipe-4.1.0.tar.gz lingpipe-4.1.0
	chmod -x $(lingpipe)

.PHONY: clean
clean: rm -f *.jar
