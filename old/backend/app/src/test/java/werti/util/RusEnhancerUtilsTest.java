package werti.util;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.types.annot.CGToken;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 04.02.17
 */
public class RusEnhancerUtilsTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private RusEnhancerUtils rusEnhancerUtils;

    @Before
    public void loadAE() throws Exception {
        uimaService = new UimaTestService();
        testPipe = createEngineDescription(
                createEngineDescription(OpenNlpTokenizer.class),
                createEngineDescription(
                        HFSTAnnotator.class,
                        "isWithTrace",
                        Boolean.FALSE,
                        "language",
                        Language.RUSSIAN
                )
        );

        final RussianTestUtilities russianTestUtilities =
                new RussianTestUtilities(uimaService.getViewContext());
        rusEnhancerUtils = russianTestUtilities.getEnhancerUtils();
    }

    private Collection<CGToken> analyse(final String text) throws Exception {
        return uimaService
                .analyseText(text, testPipe, Language.RUSSIAN)
                .select(CGToken.class);
    }

    @Test
    public void superscriptFound() throws Exception {
        String expected = "¹";

        String result = rusEnhancerUtils.getSuperscript("test¹");

        assertEquals(
                "Should return the superscript character",
                expected,
                result
        );
    }

    @Test
    public void superscriptNotFound() throws Exception {
        String expected = "";

        String result = rusEnhancerUtils.getSuperscript("test");

        assertEquals(
                "Should return an empty string",
                expected,
                result
        );
    }

    @Test
    public void hitFiltered() throws Exception {
        Collection<CGToken> cgTokens = analyse("Русской");

        CGToken cgToken = cgTokens.iterator().next();

        assertEquals(
                "Should be filtered out, as there is an adjective in the readings",
                null,
                rusEnhancerUtils.checkForHit(
                        cgToken,
                        Pattern.compile("V\\+|A\\+|Det|Pr$|Pron|Pcle|Adv|Interj|CC|CS"),
                        Pattern.compile("\\+N\\+"),
                        Pattern.compile("Sg|Pl")
                )
        );
    }

    @Test
    public void hitFound() throws Exception {
        Collection<CGToken> cgTokens = analyse("дочерей");

        CGToken cgToken = cgTokens.iterator().next();

        assertEquals(
                "Should be a hit",
                cgToken,
                rusEnhancerUtils.checkForHit(
                        cgToken,
                        Pattern.compile("V\\+|A\\+|Det|Pr$|Pron|Pcle|Adv|Interj|CC|CS"),
                        Pattern.compile("\\+N\\+"),
                        Pattern.compile("Sg|Pl")
                )
        );
    }

    @Test
    public void hitNotFound() throws Exception {
        Collection<CGToken> cgTokens = analyse(",");

        CGToken cgToken = cgTokens.iterator().next();

        assertEquals(
                "Should be no hit, as it does not match any pattern",
                null,
                rusEnhancerUtils.checkForHit(
                        cgToken,
                        Pattern.compile("V\\+|A\\+|Det|Pr$|Pron|Pcle|Adv|Interj|CC|CS"),
                        Pattern.compile("\\+N\\+"),
                        Pattern.compile("Sg|Pl")
                )
        );
    }

    @Test
    public void initialId() throws Exception {
        Map<String, MutableInt> idCounts = new HashMap<>();

        assertEquals(
                "Should be the initial id count",
                "VIEW-N-Fem-Anim-Pl-Acc-1",
                rusEnhancerUtils.getId("+N+Fem+Anim+Pl+Acc", idCounts)
        );
    }

    @Test
    public void increaseOfId() throws Exception {
        Map<String, MutableInt> idCounts = new HashMap<>();

        rusEnhancerUtils.getId("+N+Fem+Anim+Pl+Acc", idCounts);

        assertEquals(
                "Should have increased the id count",
                "VIEW-N-Fem-Anim-Pl-Acc-2",
                rusEnhancerUtils.getId("+N+Fem+Anim+Pl+Acc", idCounts)
        );
    }
}
