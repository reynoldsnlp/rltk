package werti.server.analysis;

import org.apache.uima.jcas.tcas.Annotation;
import org.hamcrest.Matchers;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Test;
import werti.server.UimaTestService;
import werti.server.enhancement.Span;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.Block;
import werti.uima.types.annot.BlockText;

import java.util.List;
import java.util.stream.Collectors;

import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-22
 */
public class CasPopulatorTest {

    private ConvenientCas cas;

    @Before
    public void setUp() throws Exception {
        cas = new UimaTestService().provideCas();
    }

    @Test
    public void setsCoherentTextAnnotations() throws Exception {
        final Document input = Jsoup.parse("<p>foo<p>bar</p> \n\t<p>bla</p>quux</p>");
        new CasPopulator().populateCas(input, cas);

        assertThat(
                "There should be four coherent text annotations",
                toSpans(BlockText.class, cas),
                Matchers.contains(
                        Span.create(0, 3),
                        Span.create(3, 6),
                        Span.create(9, 12),
                        Span.create(12, 16)
                )
        );
    }

    @Test
    public void blockAnontationsDoNotNest() throws Exception {
        final Document input = Jsoup.parse("<body>foo<div>bar</div>baz</body>");
        new CasPopulator().populateCas(input, cas);

        assertThat(
                "There should be three blocks, none of which overlap",
                toSpans(Block.class, cas),
                Matchers.contains(
                        Span.create(0, 3),
                        Span.create(3, 6),
                        Span.create(6, 9)
                )
        );
    }

    @Test
    public void zeroLengthBlockAnnotationsAreDiscarded() throws Exception {
        final Document input = Jsoup.parse("<p><div>foo</div></p>");

        new CasPopulator().populateCas(input, cas);

        assertThat(
                "If a block is of length zero, it should not be added",
                toSpans(Block.class, cas),
                Matchers.contains(
                        Span.create(0, 3)
                )
        );
    }

    private <T extends Annotation> List<Span> toSpans(Class<T> annotationClass, ConvenientCas cas) {
        return cas.select(annotationClass).stream().map(Span::span).collect(Collectors.toList());
    }

    @Test
    public void thereIsAlwaysAtLeastOneBlock() throws Exception {
        final Document input = Jsoup.parse("<body>Foo</body>");
        new CasPopulator().populateCas(input, cas);

        assertThat(
                "There should be at least one block annotation",
                toSpans(Block.class, cas),
                Matchers.contains(Span.create(0, 3))
        );
    }
}
