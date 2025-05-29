package werti.server.analysis;

import com.google.common.collect.ImmutableSet;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import werti.server.enhancement.Span;
import werti.server.html.ViewDomVisitor;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.BlockText;

import java.util.*;

/**
 * The <tt>CasPopulator</tt> serves as an interface to insert [text] and
 * [html annotations] into the CAS.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-11-05
 */
public class CasPopulator {
    private static final Logger log = LogManager.getLogger();
    /**
     * Called after the traversal, this method will supply the given CAS with all
     * that the visitor has learned during traversal.
     *
     * @param cas The cas to add annotations to
     */
    public void populateCas(final Document document, final ConvenientCas cas) {
        final PopulatorVisitor visitor = new PopulatorVisitor();
        document.body().traverse(new HtmlEatingNodeVisitor(visitor));
        final String documentText = visitor.getText();
        cas.setDocumentText(documentText);

        // we need to finish the last block annotation
        visitor.addNonZeroLengthStubAt(documentText.length());
        visitor.populateCas(cas);

        visitor.getBlockTextSpans().forEach(span -> {
            final String blockText = documentText.substring(span.begin(), span.end());
            if (blockText.trim().length() > 0) {
                cas.createAnnotation(span, BlockText.class);
            }
        });
    }

    private static class PopulatorVisitor implements ViewDomVisitor {
        private final StringBuilder text;
        private final Deque<AnnotationStubBuilder> htmlIncubatorStack;
        private final Deque<String> blockStack;
        private final HashSet<AnnotationStub> annotationStubs;
        private final BitSet blockBoundaries;

        private BlockAnnotationBuilder currentBlock;

        private static final Set<String> blockElements = ImmutableSet.of(
                "address", "article", "aside", "blockquote", "canvas", "dd", "div", "dl",
                "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4",
                "h5", "h6", "header", "hgroup", "hr", "li", "main", "nav", "noscript",
                "ol", "output", "p", "pre", "section", "table", "tfoot", "ul", "video",
                // Table cells an rows aren't HTML block elements, but considering them as such for VIEW actually
                // helps achieve a cleaner enhancement of most pages. See #241
                "tr", "td"
        );

        private String getText() {
            blockBoundaries.set(text.length());
            return text.toString();
        }

        private PopulatorVisitor () {
            this.blockBoundaries = new BitSet();
            blockBoundaries.set(0);
            this.text = new StringBuilder();
            this.htmlIncubatorStack = new ArrayDeque<>();
            this.annotationStubs = new HashSet<>();

            // not technically a block-level element, but we add it so that text between it
            // and the first block element is covered by a block level. Also, if there are no
            // blocks in the HTML (however unlikely) there needs to be at least one Block
            // annotation.
            this.currentBlock = new BlockAnnotationBuilder("body", 0);
            this.blockStack = new ArrayDeque<>();
            this.blockStack.add("body");
        }

        // Adds a block annotation at given position if the current position is not the last
        // position in the text, which would cause the annotation to have zero length
        private void addNonZeroLengthStubAt(final int position) {
            final BlockStub stub = this.currentBlock.build(position);
            if (!stub.isZeroLength()) {
                annotationStubs.add(stub);
            }
        }

        private void startBlock(final String tagName, final int position) {
            addNonZeroLengthStubAt(position);
            this.currentBlock = new BlockAnnotationBuilder(tagName, position);
            this.blockStack.push(tagName);
            blockBoundaries.set(position);
        }

        private void endBlock(final int position) {
            addNonZeroLengthStubAt(position);
            this.currentBlock = new BlockAnnotationBuilder(this.blockStack.pop(), position);
            blockBoundaries.set(position);
        }

        @Override
        public PopulatorVisitor addTextNode(final TextNode textNode) {
            text.append(textNode.getWholeText());

            return this;
        }

        @Override
        public PopulatorVisitor startElement(Element element) {
            final String tagName = element.tagName();

            htmlIncubatorStack.push(new HtmlAnnotationBuilder(tagName, text.length()));

            if (blockElements.contains(tagName)) {
                startBlock(tagName, text.length());
            }

            return this;
        }

        @Override
        public PopulatorVisitor endElement(Element element) {
            if (blockElements.contains(element.tagName())) {
                endBlock(text.length());
            }

            annotationStubs.add(htmlIncubatorStack.pop().build(text.length()));

            return this;
        }

        private List<Span> getBlockTextSpans() {
            int lastStartPosition = 0;
            final List<Span> blockSpans = new ArrayList<>();

            // there's a guaranteed boundary at 0, so we need to skip the first one, since
            // nextSetBit(n) is happy to return n if n is set.
            for (int nextBoundary = blockBoundaries.nextSetBit(1);
                 nextBoundary >= 0;
                 nextBoundary = blockBoundaries.nextSetBit(nextBoundary + 1)) {
                blockSpans.add(Span.create(lastStartPosition, nextBoundary));
                lastStartPosition = nextBoundary;

                // prevent overflow
                if (nextBoundary == Integer.MAX_VALUE) {
                    log.warn("Hit Integer.MAX_VALUE while setting BlockText annotations.");
                    break;
                }
            }
            return blockSpans;
        }

        private void populateCas(ConvenientCas cas) {
            annotationStubs.forEach(stub -> stub.addToCas(cas));
        }
    }
}
