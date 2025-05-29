package werti.uima.ae;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.uima.types.annot.CGToken;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 12.12.16
 */
public class HFSTAnnotatorTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private AnalysisEngineDescription testPipeWithMalRules;

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
        testPipeWithMalRules = createEngineDescription(
                createEngineDescription(OpenNlpTokenizer.class),
                createEngineDescription(
                        HFSTMalAnnotator.class,
                        "isWithTrace",
                        Boolean.FALSE,
                        "language",
                        Language.RUSSIAN
                )
        );
    }

    private Collection<CGToken> analyse(final String text) throws Exception {
        return uimaService
                .analyseText(text, testPipe, Language.RUSSIAN)
                .select(CGToken.class);
    }

    private Collection<CGToken> analyseWithMalRules(final String text) throws Exception {
        return uimaService
                .analyseText(text, testPipeWithMalRules, Language.RUSSIAN)
                .select(CGToken.class);
    }

    @Test
    public void noInput() throws Exception {
        String text = "";
        Collection<CGToken> cgTokens = analyse(text);

        assertEquals(
                "There should be no cg tokens.",
                0,
                cgTokens.size());
    }

    @Test
    public void withInput() throws Exception {
        String text = "Мама";
        Collection<CGToken> cgTokens = analyse(text);

        assertEquals(
                "There should be one cg token.",
                1,
                cgTokens.size());

        List<String> expectedCGTokens = Collections.singletonList(
                "Мама:0-4=мама+N+Fem+Anim+Sg+Nom"
        );

        List<String> resultCGTokens = cgTokens
                .stream()
                .map((CGToken cgToken) ->
                        cgToken.getCoveredText() + ":" +
                        cgToken.getBegin() + "-" +
                        cgToken.getEnd() + "=" +
                        cgToken.getLemma() + cgToken.getFirstReading()
                )
                .collect(Collectors.toList());

        assertEquals(
                "The cg token should have the correct begin and end after annotation.",
                expectedCGTokens,
                resultCGTokens);
    }

    @Test
    public void withInputWithMalRules() throws Exception {
        String text = "земла";
        Collection<CGToken> cgTokens = analyseWithMalRules(text);

        assertEquals(
                "There should be one cg token.",
                1,
                cgTokens.size());

        List<String> expectedCGTokens = Collections.singletonList(
                "земла:0-5=земля+N+Fem+Inan+Sg+Nom+Err/L2_Pal"
        );

        List<String> resultCGTokens = cgTokens
                .stream()
                .map((CGToken cgToken) ->
                        cgToken.getCoveredText() + ":" +
                                cgToken.getBegin() + "-" +
                                cgToken.getEnd() + "=" +
                                cgToken.getLemma() + cgToken.getFirstReading()
                )
                .collect(Collectors.toList());

        assertEquals(
                "The cg token should have the correct begin and end after annotation.",
                expectedCGTokens,
                resultCGTokens);
    }
}
