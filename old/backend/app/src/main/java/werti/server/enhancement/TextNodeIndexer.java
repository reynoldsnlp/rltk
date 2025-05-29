package werti.server.enhancement;

import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import werti.server.html.ViewDomVisitor;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-08
 */
class TextNodeIndexer implements ViewDomVisitor {
    private final TextNodeRegistry textNodeRegistry;
    private int index = 0;

    TextNodeIndexer(final TextNodeRegistry textNodeRegistry) {
        this.textNodeRegistry = textNodeRegistry;
    }

    @Override
    public ViewDomVisitor addTextNode(TextNode node) {
        final SmartTextNode smartNode = SmartTextNode.create(node, index);
        index = textNodeRegistry.registerOne(smartNode);
        return this;
    }

    @Override
    public ViewDomVisitor startElement(Element element) {
        return this;
    }

    @Override
    public ViewDomVisitor endElement(Element element) {
        return this;
    }
}
