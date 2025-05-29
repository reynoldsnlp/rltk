package werti.server.analysis;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-22
 */
public class BlockAnnotationBuilder implements AnnotationStubBuilder {
    private final int begin;
    private final String tagName;

    public BlockAnnotationBuilder(final String tagName, final int begin) {
        this.begin = begin;
        this.tagName = tagName;
    }

    @Override
    public BlockStub build(int end) {
        return new BlockStub(begin, end, tagName);
    }
}
