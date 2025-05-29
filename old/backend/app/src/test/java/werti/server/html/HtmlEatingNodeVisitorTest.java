package werti.server.html;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.select.NodeVisitor;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import werti.server.analysis.CasPopulator;
import werti.server.analysis.HtmlEatingNodeVisitor;
import werti.uima.ConvenientCas;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-22
 */
public class HtmlEatingNodeVisitorTest {
    @Rule public MockitoRule rule = MockitoJUnit.rule();

    private NodeVisitor nodeVisitor;
    private CasPopulator casPopulator;
    private ConvenientCas cas;

    @Mock ViewDomVisitor domVisitor;


    @Before
    public void setUp() {
        nodeVisitor = new HtmlEatingNodeVisitor(domVisitor);
    }

    @Test
    public void ignoresIrrelevantTags() {
        // given
        final Document document = Jsoup.parse(
                "<body> foo " +
                        "<script>bla</script>" +
                        "<aside><div> foo </div> bar </aside>" +
                        "<pre>foo</pre>" +
                        "<code></code>" +
                        " bla</body>"
        );

        // when
        document.body().traverse(nodeVisitor);

        // then
        verify(domVisitor, times(1)).startElement(any(Element.class));
        verify(domVisitor, times(1)).endElement(any(Element.class));
        verify(domVisitor, times(2)).addTextNode(any(TextNode.class));
    }

    @Test
    public void ignoresComments() {
        // given
        final Document document = Jsoup.parse(
                "<body> foo <!-- this is a comment --> bla</body>"
        );

        // when
        document.body().traverse(nodeVisitor);

        // then
        verify(domVisitor, times(1)).endElement(any(Element.class));
    }
}
