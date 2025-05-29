package werti.server.enhancement;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.TextNode;
import org.junit.Test;

import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-05
 */
public class AncestorFinderTest {

    @Test
    public void findsAncestor() throws Exception {
        final Document document = Jsoup.parse("<foo>bar<i>baz<b>barf</b></i>bee<foo>");
        final List<TextNode> textNodes = new TextNodeFilter(document).apply();
        final AncestorFinder ancestorFinder = new AncestorFinder(textNodes);
        assertThat(
                "The ancestor should be the <foo> tag.",
                ancestorFinder.getCommonAncestor(),
                is(document.select("foo").get(0))
        );
        assertThat(
                "There should be three children of the common parent.",
                ancestorFinder.getDirectDescendantsOfCommonAncestor().size(),
                is(3)
        );
    }
}
