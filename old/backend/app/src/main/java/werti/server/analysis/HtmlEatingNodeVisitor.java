package werti.server.analysis;

import com.google.common.collect.ImmutableList;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.NodeVisitor;
import werti.server.html.ViewDomVisitor;

import java.util.Collection;

/**
 * Serializes an HTML document to a CAS structure with all HTML tags turned into
 * annotations, and the text nodes of non-ignored tags being part of the documentText.
 * The html annotations are not part of the CAS documentText.
 * Assumes depth-first traversal of the DOM.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-22
 */
public class HtmlEatingNodeVisitor implements NodeVisitor {
    private final ViewDomVisitor domVisitor;

    /**
     * Being ignored means that the current subtree is under an ignored tag.
     * This is switched on during the visit of the tag head, and then switched
     * off again during the visit of the end tag, as soon as it reaches the same
     * depth the ignore started (see htmlIncubatorStack, and, in particular, the
     * depth field of HtmlAnnotationStubGenerator).
     */
    private boolean isInIgnoredSubtree = false;
    private int ignoreUntilDepth;

    private static final Collection<String> ignoredTags = ImmutableList.of(
            "script", "meta", "aside", "code", "pre", "sup", "sub"
    );

    public HtmlEatingNodeVisitor(ViewDomVisitor domVisitor) {
        this.domVisitor = domVisitor;
    }

    @Override
    public void head(final Node node, final int depth) {
        if (isInIgnoredSubtree) {
            return;
        }

        if (node instanceof Element) {
            final Element element = (Element) node;
            if (isIgnoredTagName(element.tagName())) {
                isInIgnoredSubtree = true;
                ignoreUntilDepth = depth;
            } else {
                domVisitor.startElement(element);
            }
        } else if (node instanceof TextNode) {
            domVisitor.addTextNode((TextNode) node);
        }

        // We ignore all other kinds of Nodes
    }

    @Override
    public void tail(final Node node, final int depth) {
        if (node instanceof Element) {
            if (!isInIgnoredSubtree) {
                domVisitor.endElement((Element) node);
            } else if (depth == ignoreUntilDepth){
                isInIgnoredSubtree = false;
            }
        }

        // We only care about closing non-ignored Elements
    }

    /**
     * Static method to check whether a certain tag is being ignored.
     *
     * @param tagName The name of the tag, e.g. <tt>"script"</tt> or <tt>"p"</tt>.
     * @return <tt>true</tt> iff the tag is on the ignored tags list.
     */
    public static boolean isIgnoredTagName(final String tagName) {
        return ignoredTags.contains(tagName);
    }
}
