package werti.server.enhancement;

import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.NodeVisitor;

import java.util.ArrayList;
import java.util.List;

/**
 * Element.textNodes() only gets you the *directly* descending TextNodes. We want all.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-05-13
 */ //
class TextNodeFilter implements NodeVisitor {
    private final Element root;
    private final List<TextNode> textNodes;

    List<TextNode> apply() {
        root.traverse(this);
        return textNodes;
    }

    TextNodeFilter(final Element root) {
        this.root = root;
        this.textNodes = new ArrayList<>();
    }

    @Override
    public void head(
            Node node,
            int depth
    ) {
        if (node instanceof TextNode) {
            textNodes.add((TextNode) node);
        }
    }

    @Override
    public void tail(
            Node node,
            int depth
    ) {
        /* no need to do anything on tail */
    }
}
