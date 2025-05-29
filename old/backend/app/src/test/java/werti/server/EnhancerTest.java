package werti.server;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import org.trimou.util.ImmutableList;
import werti.Language;
import werti.server.enhancement.CasEnhancer;
import werti.server.enhancement.DocumentEnhancer;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.types.annot.Token;

import java.util.Collections;
import java.util.List;
import java.util.function.Function;

import static org.junit.Assert.assertEquals;

/**
 * Tests the ability of <tt>{@link werti.server.enhancement.TextNodeEnhancer}</tt> to place
 * elements correctly in the DOM, but integrates it into the complete tool chain.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-21
 */
public class EnhancerTest {
    @Rule public MockitoRule rule = MockitoJUnit.rule();
    private static final String standardHtml = "<p>That is <em>quite some</em> text.</p>";

    private DocumentEnhancer<ConvenientCas> enhancer;
    private UimaTestService uimaService;
    private AnalysisEngineDescription tokenizer;

    @Before
    public void setUp() throws Exception {
        tokenizer = AnalysisEngineFactory.createEngineDescription(OpenNlpTokenizer.class);
        uimaService = new UimaTestService();
        enhancer = new CasEnhancer();
    }

    private void runTestOn(
            final String inputDocument,
            final String expectedResult,
            final String documentation,
            final Function<ConvenientCas, List<Enhancement>> enhancementGenerator
    ) throws Exception {
        final Document html = Jsoup.parse(inputDocument);
        final ConvenientCas cas = uimaService.analyseHtml(html, tokenizer, Language.ENGLISH);
        final List<Enhancement> enhancements = enhancementGenerator.apply(cas);
        final Document result = enhancer.enhance(cas, html, enhancements);
        result.select("viewEnhancement").removeAttr("id");

        assertEquals(
                documentation,
                Jsoup.parse(expectedResult).body().outerHtml(),
                result.body().outerHtml()
        );
    }

    private Token getToken(ConvenientCas cas, String text) {
        return cas.getFirstAnnotationWithText(Token.class, text)
                .orElseThrow(RuntimeException::new);
    }

    private ViewEnhancement enhanceToken(final ConvenientCas cas, String match) {
        final Token test = getToken(cas, match);
        return new ViewEnhancement(test);
    }

    // See #106
    @Test
    public void emptyTagsAreNotDestroyed() throws Exception {
        final String document = "<i class='icon'></i><i class='icon'></i><b></b>Foobar";
        runTestOn(
                document,
                document,
                "<i> tags should not be bungled",
                cas -> Collections.emptyList()
        );
    }

    @Test
    public void tokensWithAttributes() throws Exception {
        final String document = "<b>This is a test</b>";
        final String expectedResult =
                "<b>" + "<viewEnhancement data-original-text=\"This\">This</viewEnhancement> " +
                        "<viewEnhancement data-hit=\"true\" data-original-text=\"is\">is</viewEnhancement> " +
                        "<viewEnhancement data-original-text=\"a\">a</viewEnhancement> " +
                        "<viewEnhancement data-original-text=\"test\" " +
                        "data-hit=\"meh\">test</viewEnhancement>" +
                        "</b>";
        runTestOn(
                document,
                expectedResult,
                "Attributes should be added correctly",
                cas -> ImmutableList.of(
                        enhanceToken(cas, "This"),
                        enhanceToken(cas, "is").addAttribute("hit", "true"),
                        enhanceToken(cas, "a"),
                        enhanceToken(cas, "test").addAttribute("hit", "meh"))
        );
    }

    @Test
    public void dealsWellWithUnicode() throws Exception {
        final String document = "<body>ЯЯа <div>аььоа</div> мнткс→ <div>ประเทศไทย</div> </body>";
        final String expectedResult = "<body>ЯЯа <div>" +
                "<viewEnhancement data-original-text=\"аььоа\">аььоа</viewEnhancement>" +
                "</div> мнткс→ <div>" +
                "ประเทศไทย" +
                 "</div> </body>";
        runTestOn(
                document,
                expectedResult,
                "We shall not fear the Unicodes",
                cas -> ImmutableList.of(enhanceToken(cas, "аььоа"))
        );
    }

    @Test
    public void resolvesEqualSizedTags() throws Exception {
        // given
        final String document = "<b>foo</b><i>bar</i>";
        final String expectedResult = "<b>foo</b><i>bar</i>";

        runTestOn(
                document,
                expectedResult,
                "Equal length subsequent tags aren't mistakenly twisted.",
                cas -> Collections.emptyList()
        );
    }

    @Test
    public void placesSingleEnhancementCorrectly() throws Exception {
        // given
        final String expectedResult = "<p>" +
                "<viewEnhancement data-original-text=\"That\">That</viewEnhancement> " +
                "is <em>quite some</em> text." +
                "</p>";
        runTestOn(
                standardHtml,
                expectedResult,
                "A simple token enhancement is treated correctly.",
                cas -> ImmutableList.of(enhanceToken(cas, "That"))
        );
    }

    @Test @Ignore // see #67
    public void interleavingAnnotationsWork() throws Exception {
        final String expectedResult =
                "<p>" +
                        "That <viewEnhancement data-index=\"0\">is</viewEnhancement> " +
                        "<em><viewEnhancement data-view-continued=\"0\">quite</viewEnhancement>" +
                        "some</em> text.</p>";
        runTestOn(
                standardHtml,
                expectedResult,
                "Enhancements interleaving other tags create a continued annotation",
                cas -> {
                    final Token is = getToken(cas, "is");
                    final Token quite = getToken(cas, "quite");
                    return ImmutableList.of(new ViewEnhancement(is.getBegin(), quite.getEnd()));
                }
        );
    }

    /**
     * Interleaving annotations are tricky, HTML doesn't support them. This is especially
     * tricky since we work with just spans, and the closing tags can be ambiguous.
     *
     * The scenario is as follows:
     *
     * <pre>
     *         enhancement0
     *     ,------------------,
     *     That is <>quite some</> text.
     *               `----------------`
     *                  enhancement1
     * </pre>
     *
     * We expect the following html annotations
     *
     * <pre>
     *       enhancement-spans-0
     *     ,-----, ,-------------,
     *     That is <>quite some</> text.
     *             `-------------` `--`
     *              enhancement-spans-1
     * </pre>
     *
     * Whether enhancement0's spans nest enhancement1's spans or the other way around doesn't
     * matter, but we assume that the "older" enhancement's spans nest the "younger" one's.
     *
     * @throws Exception Hopefully never
     */
    @Test @Ignore // see #67
    public void interleavingSpansAreTreatedCorrectly() throws Exception {
        // given
        final String expectedResult = "<p>" +
                        "<viewEnhancement data-index=\"0\">" +
                        "That is" +
                        "</viewEnhancement>" +
                        "<viewEnhancement data-continued=\"0\">" +
                        "<viewEnhancement data-index=\"1\">" +
                        "<em>quite some</em>" +
                        "</viewEnhancement></viewEnhancement>" +
                        "<viewEnhancement data-continued=\"1\">" +
                        "text.</viewEnhancement>";
        runTestOn(
                standardHtml,
                expectedResult,
                "Interleaving enhancements are treated correctly even around interfering tags.",
                cas -> {
                    final Token that  = getToken(cas, "That");
                    final Token quite = getToken(cas, "quite");
                    final Token some  = getToken(cas, "some");
                    final Token text  = getToken(cas, "text");
                    return ImmutableList.of(
                            new ViewEnhancement(that.getBegin(), some.getEnd()),
                            new ViewEnhancement(quite.getBegin(), text.getEnd())
                    );
                }
        );
    }

    @Test
    public void spansCorrectlyNestOtherTags() throws Exception {
        final String expectedResult = "<p>" +
                "That <viewEnhancement>is <em>quite some</em> text</viewEnhancement>.</p>";
        runTestOn(
                standardHtml,
                expectedResult,
                "Spans nesting other tags are correctly percolated up.",
                cas -> {
                    final Token is = getToken(cas, "is");
                    final Token text = getToken(cas, "text");
                    return ImmutableList.of(new ViewEnhancement(is.getBegin(), text.getEnd()));
                }
        );
    }

    @Test
    public void nothingIsDoneWithoutEnhancements() throws Exception {
        runTestOn(
                standardHtml,
                standardHtml,
                "Nothing is done when no enhancement annotations are present.",
                cas -> Collections.emptyList()
        );
    }

    @Test
    public void spansAreInsideHtmlTags() throws Exception {
        final String document = "<b>foo</b>";
        final String expectedResult =
                "<b><viewEnhancement data-original-text=\"foo\">foo</viewEnhancement></b>";
        runTestOn(
                document,
                expectedResult,
                "VIEW spans are inside length/position-equivalent html tags",
                cas -> ImmutableList.of(enhanceToken(cas, "foo"))
        );
    }
}
