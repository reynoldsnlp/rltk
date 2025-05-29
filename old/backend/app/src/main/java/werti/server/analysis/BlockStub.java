package werti.server.analysis;

import werti.uima.ConvenientCas;
import werti.uima.types.annot.Block;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-06
 */
public class BlockStub extends AnnotationStub {
    private String enclosingTag;

    BlockStub(int begin, int end, final String enclosingTag) {
        super(begin, end);
        this.enclosingTag = enclosingTag;
    }

    @Override
    public void addToCas(final ConvenientCas cas) {
        final Block annotation = cas.createAnnotation(
            this.begin, this.end, Block.class
        );
        annotation.setBlockName(this.enclosingTag);
    }

    boolean isZeroLength() {
        return begin == end;
    }
}
