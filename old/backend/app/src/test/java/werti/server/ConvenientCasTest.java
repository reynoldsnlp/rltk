package werti.server;

import org.jsoup.Jsoup;
import org.junit.Test;
import werti.Language;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.types.annot.Token;

import java.util.List;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertTrue;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-21
 */
public class ConvenientCasTest {
    @Test
    public void correctlyGetsAllAnnotationsWithClass() throws Exception {
        // given
        final String documentText = "This is a short text. It contains only the word short twice.";
        final UimaTestService uimaService = new UimaTestService();
        final ConvenientCas cas = uimaService.analyseHtml(
                Jsoup.parse(documentText),
                createEngineDescription(OpenNlpTokenizer.class),
                Language.ENGLISH
        );

        // when
        List<Token> shortTokens = cas.getAnnotationsWithText(Token.class, "short");
        List<Token> noTokens = cas.getAnnotationsWithText(Token.class, "impossible");

        // then
        assertTrue(
                "The first word is present as annotation and can be queried by text.",
                cas.getFirstAnnotationWithText(Token.class, "This").isPresent()
        );
        assertTrue(
                "The token that didn't occur couldn't be found.",
                noTokens.size() == 0
        );
        assertTrue(
                "The token 'short' was found twice.",
                shortTokens.size() == 2
        );
    }

}
