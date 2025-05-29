package werti.uima.ae;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.uima.types.annot.AnalysisResults;

import java.util.Collection;
import java.util.stream.Collectors;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 25.04.17
 */
public class RusStressAnnotatorTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;

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
                ),
                createEngineDescription(RusStressAnnotator.class)
        );
    }

    private Collection<AnalysisResults> analyseWithFeedback(
            final String correctAnswerSentenceWithTags,
            final String submission
    ) throws Exception {
        return uimaService
                .analyseTextWithFeedback(correctAnswerSentenceWithTags, submission, testPipe, Language.RUSSIAN)
                .select(AnalysisResults.class);
    }

    @Test
    public void correctAnswerWithStress() throws Exception {
        String correctAnswerSentenceWithTags = "<viewenhancement>Фоны</viewenhancement>, " +
                "принадлежащие к одной фонеме, называются аллофонами.";
        String submission = "фонеме";

        String expectedAnalysisResults = "фо́ны";

        String resultAnalysisResults = analyseWithFeedback(correctAnswerSentenceWithTags, submission)
                .stream()
                .map(AnalysisResults::getAnswerWithStress)
                .collect(Collectors.joining());

        assertEquals(
                "The results should be the correct answer with stress marker.",
                expectedAnalysisResults,
                resultAnalysisResults
        );
    }
}