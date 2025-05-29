package werti.uima.ae;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.cas.text.AnnotationIndex;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.apache.uima.fit.testing.factory.TokenBuilder;
import org.apache.uima.fit.util.FSCollectionFactory;
import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.tcas.Annotation;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.uima.ConvenientCas;
import werti.uima.types.annot.SentenceAnnotation;
import werti.uima.types.annot.Token;

import java.util.Collection;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since  2016-09-08
 */
public class LingPipeTaggerTest {
    private final Logger log = LogManager.getLogger();
    private AnalysisEngineDescription ae;
    private TokenBuilder<Token, SentenceAnnotation> tokenBuilder;
    private UimaTestService uimaService;

    @Before
    public void loadAE() throws Exception {
        this.ae = AnalysisEngineFactory.createEngineDescription(LingPipeTagger.class);
        this.tokenBuilder = new TokenBuilder<>(
                Token.class,
                SentenceAnnotation.class,
                "tag",
                "lemma"
        );
        this.uimaService = new UimaTestService();
    }

    @Test
    public void testAE() {
        Assert.assertNotNull(
                "Analysis engine is loaded.",
                this.ae
        );
    }

    @Test
    public void testProcessSimple() throws Exception {
        final String testText   = "This is a test text.";
        final String testTokens = "This is a test text .";

        final ConvenientCas cas = uimaService.provideCas(Language.ENGLISH);
        final JCas jcas = cas.getCas();

        this.tokenBuilder.buildTokens(jcas, testText, testTokens);

        uimaService.runPipeline(cas, this.ae);

        final AnnotationIndex<Token> index = jcas.getAnnotationIndex(Token.class);
        final Collection<Token> tokens = FSCollectionFactory.create(index);

        final String resultTokens = tokens.stream()
                .map(Annotation::getCoveredText)
                .collect(Collectors.joining(" "));

        final String resultPos = tokens.stream()
                .map(Token::getTag)
                .collect(Collectors.joining(" "));

        Assert.assertEquals(
                "Tokens in cas have the surface we expected.",
                testTokens,
                resultTokens
        );

        Assert.assertEquals(
                "Test tokens have the tags we expect",
                "dt bez at nn nn .",
                resultPos
        );
    }

    @Test
    public void testProcessPrepositions() throws Exception {
        final String testText = "This sentence contains a dash - which shouldn't be "
                + " a preposition — neither should this em-dash be one.";

        final String testTokens = "This sentence contains a dash - which should n't be "
                + " a preposition — neither should this em - dash be one .";

        final ConvenientCas cas = uimaService.provideCas(Language.ENGLISH);
        final JCas jcas = cas.getCas();

        this.tokenBuilder.buildTokens(jcas, testText, testTokens);
        uimaService.runPipeline(cas, this.ae);

        final AnnotationIndex<Token> index = jcas.getAnnotationIndex(Token.class);
        final Collection<Token> tokens = FSCollectionFactory.create(index);

        final String resultPos = tokens.stream()
                .map(token -> token.getCoveredText() + "/" + token.getTag())
                .collect(Collectors.joining(" "));

        log.debug(resultPos);
    }
}
