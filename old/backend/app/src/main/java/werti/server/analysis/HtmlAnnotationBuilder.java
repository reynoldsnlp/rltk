package werti.server.analysis;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-22
 */
public class HtmlAnnotationBuilder implements AnnotationStubBuilder {
    private final String tagName;
    private final int begin;

    public HtmlAnnotationBuilder(final String tagName, final int begin) {
        this.tagName = tagName;
        this.begin = begin;
    }

    public String getTagName() {
        return tagName;
    }

    @Override
    public HtmlAnnotationStub build(final int end) {
        return new HtmlAnnotationStub(this.tagName, this.begin, end);
    }
}
