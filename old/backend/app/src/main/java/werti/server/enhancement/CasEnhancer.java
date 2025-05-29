package werti.server.enhancement;

import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import werti.server.analysis.HtmlEatingNodeVisitor;
import werti.uima.ConvenientCas;

import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-11-08
*/
public class CasEnhancer implements DocumentEnhancer<ConvenientCas> {
    /*
     * Mutable field, holds the current id for this document.
     */
    private int currentId;

    public CasEnhancer() {
        currentId = 1;
    }

    @Override
    public Document enhance(
            final ConvenientCas cas,
            final Document input,
            final List<Enhancement> enhancements
    ) {
        final TextNodeRegistry textNodeRegistry = new TextNodeRegistry(cas.getDocumentText().length());
        input.body().traverse(
                new HtmlEatingNodeVisitor(new TextNodeIndexer(textNodeRegistry))
        );
        final TextNodeEnhancer helper = new TextNodeEnhancer(textNodeRegistry);

        enhancements.forEach(
                enhancement -> {
                    final Element element = createElement(enhancement, input);
                    helper.addEnhancement(enhancement.getSpan(), element);
                }
        );

        return input;
    }

    private Element createElement(final Enhancement enhancement, final Document document) {
        final Element element = enhancement.createElement(document);
        final String dataId = element.attr("data-id");
        if ("".equals(dataId)) {
            final String uniqueId = "viewId-" + currentId++;
            element.attr("id", uniqueId);
        } else {
            element.attr("id", dataId);
            element.removeAttr("data-id");
        }
        return element;
    }
}
