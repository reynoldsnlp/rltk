package werti.server.enhancement;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Test;
import werti.server.analysis.HtmlEatingNodeVisitor;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-05-07
 */
public class TextNodeEnhancerTest {
    @Test
    public void projectsOverTwoNodesIfBothAreFullyCovered() throws Exception {
        final Document document = Jsoup.parse(
                "<p>a</p><p>b</p>"
        );

        final TextNodeEnhancer enhancer = makeEnhancer(document, 2);
        enhancer.addEnhancement(Span.create(0, 2), document.createElement("test"));

        assertThat(
                "<test> should be over both <p>",
                document.select("test p").size(),
                is(2)
        );
    }

    private TextNodeEnhancer makeEnhancer(final Document document, final int textLength) {
        final TextNodeRegistry registry = new TextNodeRegistry(textLength);
        document.body().traverse(
                new HtmlEatingNodeVisitor(new TextNodeIndexer(registry))
        );

        return new TextNodeEnhancer(registry);
    }

    @Test
    public void insertsElementIfChoppedOnBothEnds() throws Exception {
        final Document document = Jsoup.parse(
                "<p>ab<b>c</b>de</p>"
        );

        final TextNodeEnhancer enhancer = makeEnhancer(document, 5);
        enhancer.addEnhancement(Span.create(1, 4), document.createElement("test"));

        assertThat(
                "The text under the inserted element should be bcd",
                document.select("test").text(),
                is("bcd")
        );
    }

    @Test
    public void doesntProjectOverTwoNodesIfTheyAreNotFullyCovered() throws Exception {
        final Document document = Jsoup.parse(
                "<p>ab</p><p>cde</p>"
        );

        final TextNodeEnhancer enhancer = makeEnhancer(document, 5);
        enhancer.addEnhancement(Span.create(1, 4), document.createElement("test"));

        assertThat(
                "<test> should be under a <p> tag",
                document.select("p test").size(),
                is(1)
        );

        assertThat(
                "<test> should have bc as text",
                document.select("test").text(),
                is("cd")
        );
    }
}
