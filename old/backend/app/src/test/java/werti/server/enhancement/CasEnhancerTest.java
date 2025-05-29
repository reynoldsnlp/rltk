package werti.server.enhancement;

import com.google.common.collect.ImmutableList;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.SentenceAnnotation;

import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-23
 */
public class CasEnhancerTest {
    @Rule
    public final MockitoRule rule = MockitoJUnit.rule();

    @Mock
    private ConvenientCas cas;
    private Document input;

    @Before
    public void setUp() {
        when(cas.getDocumentText()).thenReturn("foo");
        input = Jsoup.parse("foo");
    }

    @Test // #244
    public void sentenceProjectsOverViewEnhancement() throws Exception {
        final SentenceAnnotation sentenceAnnotation = mock(SentenceAnnotation.class);
        when(sentenceAnnotation.getBegin()).thenReturn(0);
        when(sentenceAnnotation.getEnd()).thenReturn(1);
        when(sentenceAnnotation.getCoveredText()).thenReturn("");

        final List<Enhancement> enhancements = ImmutableList.of(
                new SentenceEnhancement(sentenceAnnotation),
                new ViewEnhancement(0, 1)
        );

        final Elements result = enhanceHtml(enhancements);

        assertThat(
                "The viewEnhancement has a <sentence> parent.",
                result.first().parent().tag().getName(),
                is("sentence")
        );
    }

    @Test
    public void elementsWithoutIdGetAnIncrementalId() throws Exception {
        final List<Enhancement> enhancements = ImmutableList.of(
                new ViewEnhancement(0, 1),
                new ViewEnhancement(1, 2).addAttribute("id", "anId"),
                new ViewEnhancement(2, 3)
        );

        final Elements result = enhanceHtml(enhancements);

        assertThat(
                "There should be one element with id viewEnhancement-1",
                result.select("#viewId-1").size(),
                is(1)
        );

        assertThat(
                "There should be one element with id viewEnhancement-2",
                result.select("#viewId-2").size(),
                is(1)
        );

        assertThat(
                "There should be an element with id anId",
                result.select("#anId").size(),
                is(1)
        );

        assertTrue(
                "There should be no element with viewEnhancement-3",
                result.select("#viewEnhancement-3").isEmpty()
        );
    }

    private Elements enhanceHtml(List<Enhancement> enhancements) {
        return new CasEnhancer().enhance(cas, input, enhancements)
                .select("viewenhancement");
    }

    @Test
    public void attributesAreCorrectlySerialised() throws Exception {
        final List<Enhancement> enhancements = ImmutableList.of(
                new ViewEnhancement(0, 3)
                        .addAttribute("id", "my-id")
                        .addAttribute("attribute", "my-attribute")
        );

        final Elements result = enhanceHtml(enhancements);

        assertThat(
                "There should be exactly one enhancement",
                result.size(),
                is(1)
        );

        final Element enhancement = result.iterator().next();

        assertThat(
                "The enhancement should carry the correct id",
                enhancement.attr("id"),
                is("my-id")
        );

        assertThat(
                "The enhancement should have the correct data- attribute",
                enhancement.attr("data-attribute"),
                is("my-attribute")
        );
    }
}
