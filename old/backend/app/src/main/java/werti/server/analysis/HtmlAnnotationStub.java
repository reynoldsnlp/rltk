package werti.server.analysis;

import werti.uima.ConvenientCas;
import werti.uima.types.annot.HtmlAnnotation;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-06
 */
class HtmlAnnotationStub extends AnnotationStub {
    private final String tagName;

    HtmlAnnotationStub(final String tagName, final int begin, final int end) {
        super(begin, end);
        this.tagName = tagName;
    }

    @Override
    public void addToCas(final ConvenientCas cas) {
        final HtmlAnnotation annotation = cas.createAnnotation(
                this.begin,
                this.end,
                HtmlAnnotation.class
        );
        annotation.setTagName(tagName);
    }

}
