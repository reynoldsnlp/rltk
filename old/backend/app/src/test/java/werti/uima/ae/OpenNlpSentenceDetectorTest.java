package werti.uima.ae;

import com.google.common.collect.ImmutableList;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.apache.uima.fit.util.JCasUtil;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.BlockText;
import werti.uima.types.annot.SentenceAnnotation;

import java.util.Collection;
import java.util.List;
import java.util.Spliterator;

import static java.util.stream.Collectors.joining;
import static java.util.stream.Collectors.toList;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.junit.Assert.assertTrue;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-17
 */
public class OpenNlpSentenceDetectorTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription openNlpPipe;

    @Before
    public void setUp() throws Exception {
        uimaService = new UimaTestService();
        openNlpPipe = AnalysisEngineFactory.createEngineDescription(
                AnalysisEngineFactory.createEngineDescription(OpenNlpTokenizer.class),
                AnalysisEngineFactory.createEngineDescription(OpenNlpSentenceDetector.class)
        );
    }

    @Test
    public void breaksSentencesOnBlockElements() throws Exception {
        final String documentText = "This sentence spans blocks.";

        final ConvenientCas cas = uimaService.provideCas(Language.ENGLISH);
        cas.setDocumentText(documentText);

        cas.createAnnotation(0, 13, BlockText.class);
        cas.createAnnotation(14, documentText.length(), BlockText.class);

        uimaService.runPipeline(cas, openNlpPipe);

        final Collection<SentenceAnnotation> sentences = cas.select(SentenceAnnotation.class);

        assertThat(
                "The sentences should cover the first two and last two words, respectively",
                sentences.stream().map(SentenceAnnotation::getCoveredText).collect(toList()),
                contains("This sentence", "spans blocks.")
        );
    }

    @Test
    public void process() throws Exception {
        final List<String> expectedSentences = ImmutableList.of(
                "Modern web applications require more interactivity than ever before for client/server communications.",
                "Tomcat implements the Java WebSocket 1.1 API defined by JSR-356.",
                "The style.css file is added to the project.",
                "Dr. Herman is a quack, Ms. Anderson, I thought you should know."
        );

        final ConvenientCas cas = uimaService.provideCas(Language.ENGLISH);

        final String documentText = expectedSentences.stream().collect(joining(" "));
        cas.setDocumentText(documentText);
        cas.createAnnotation(0, documentText.length(), BlockText.class);

        uimaService.runPipeline(cas, openNlpPipe);

        final Spliterator<SentenceAnnotation> resultSentences =
                JCasUtil.select(cas.getCas(), SentenceAnnotation.class).spliterator();

        expectedSentences.forEach(expectedSentence -> assertTrue(
                "Expected sentence has a corresponding result sentence.",
                resultSentences.tryAdvance(resultSentence -> assertThat(
                        "Expected sentence and result sentence match.",
                        resultSentence.getCoveredText(),
                        is(expectedSentence)
                ))
        ));
    }
}
