package werti.server.analysis;

import werti.uima.ConvenientCas;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-06
 */
abstract class AnnotationStub {
    protected final int begin;
    protected final int end;

    AnnotationStub(final int begin, final int end) {
        this.begin = begin;
        this.end = end;
    }

    abstract void addToCas(
            final ConvenientCas cas
    );
}
