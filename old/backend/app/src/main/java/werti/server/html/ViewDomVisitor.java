package werti.server.html;

import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-05
 */
public interface ViewDomVisitor {
    ViewDomVisitor addTextNode(final TextNode node);
    ViewDomVisitor startElement(final Element element);
    ViewDomVisitor endElement(final Element element);
}
