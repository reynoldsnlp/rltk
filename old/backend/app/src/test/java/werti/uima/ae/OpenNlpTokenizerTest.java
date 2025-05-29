package werti.uima.ae;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.hamcrest.Matchers;
import org.jsoup.Jsoup;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.Token;

import java.util.List;
import java.util.stream.Collectors;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertThat;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-16
 */
public class OpenNlpTokenizerTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription tokenizer;

    @Before
    public void setUp() throws Exception {
        uimaService = new UimaTestService();
        tokenizer = createEngineDescription(OpenNlpTokenizer.class);
    }

    @Test
    public void testProcess() throws Exception {
        final ConvenientCas cas = uimaService.analyseHtml(
                Jsoup.parse("Dr. Herman had said it wasn't seri<i>ous</i>," +
                        " <b>but<b> I didn't agree."),
                tokenizer,
                Language.ENGLISH
        );

        assertThat(
                "All words should be tokenized corrcetly",
                getTokenSurfaces(cas),
                Matchers.contains(
                        "Dr.",
                        "Herman",
                        "had",
                        "said",
                        "it",
                        "was",
                        "n't",
                        "serious",
                        ",",
                        "but",
                        "I",
                        "did",
                        "n't",
                        "agree",
                        "."
                )
        );

    }

    @Test
    public void splitsTokensOnBlocks() throws Exception {
        final ConvenientCas cas = uimaService.analyseHtml(
                Jsoup.parse("<p>foo</p><p>bar</p>"),
                tokenizer,
                Language.ENGLISH
        );

        assertThat(
                "The tokens should not span over the block",
                getTokenSurfaces(cas),
                Matchers.contains("foo", "bar")
        );
    }

    private List<String> getTokenSurfaces(final ConvenientCas cas) {
        return cas.select(Token.class).stream()
                  .map(Token::getCoveredText)
                  .collect(Collectors.toList());
    }

    @Test @Ignore // Unfortunately, unicode punctuation is still a problem
    public void dealsWithUnicodeApostrophes() throws Exception {
        final ConvenientCas cas = uimaService.analyseText(
                // note, the space bofer "John" is a non-breaking space
                "“Don’t worry about my wife’s car,” said John.",
                tokenizer,
                Language.ENGLISH
        );

        assertThat(
                "The tokens should match up with the expected results",
                getTokenSurfaces(cas),
                Matchers.contains(
                        "“",
                        "Do",
                        "n’t",
                        "worry",
                        "about",
                        "my",
                        "wife",
                        "’",
                        "s",
                        "car",
                        ",",
                        "”",
                        "said",
                        "John",
                        "."
                )
        );
    }
}
