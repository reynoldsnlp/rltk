package werti.util;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.TestResourceFactory;
import werti.server.UimaTestService;
import werti.uima.ConvenientCas;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.types.annot.Token;

import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 15.12.16
 */
public class HFSTAnalyserTest {

    private static HFSTAnalyser rusHfstAnalyser;
    private static HFSTAnalyser estHfstAnalyser;

    private AnalysisEngineDescription aeTokenizer;
    private UimaTestService uimaService;

    @Before
    public void loadAEAndHFSTAnalyser() throws Exception {
        aeTokenizer = AnalysisEngineFactory.createEngineDescription(OpenNlpTokenizer.class);
        uimaService = new UimaTestService();
        rusHfstAnalyser = initHfstAnalyser(Language.RUSSIAN);
        estHfstAnalyser = initHfstAnalyser(Language.ESTONIAN);
    }

    private HFSTAnalyser initHfstAnalyser(Language language) throws Exception {
        return new HFSTAnalyser(
                new TestResourceFactory(uimaService.getViewContext()),
                language
        );
    }

    @Test
    public void rusInputListResultNoReadings() throws Exception {
        String text = "МАМА";
        final ConvenientCas cas = uimaService.analyseText(text, aeTokenizer, Language.RUSSIAN);

        Collection<Token> analyserInputList = cas.select(Token.class);

        String expectedAnalyses = "МАМА\t+?\n";

        String resultAnalyses = rusHfstAnalyser.runTransducer(analyserInputList);

        assertEquals(
                "There should be no readings for 'МАМА'.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void rusInputListResultWithReadings() throws Exception {
        String text = "Мама видела";
        final ConvenientCas cas = uimaService.analyseText(text, aeTokenizer, Language.RUSSIAN);

        Collection<Token> analyserInputList = cas.select(Token.class);

        String expectedAnalyses =
                "Мама\tмама+N+Fem+Anim+Sg+Nom\n" +
                "\n" +
                "видела\tвидеть+V+Impf+IV+Pst+Fem+Sg\n" +
                "видела\tвидеть+V+Impf+TV+Pst+Fem+Sg\n";

        String resultAnalyses = rusHfstAnalyser.runTransducer(analyserInputList);

        assertEquals(
                "There should be one reading for 'Мама' and two readings for 'видела'.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void rusInputString() {
        Set<String> expectedAnalyses = new HashSet<>(Arrays.asList("города\tгород+N+Msc+Inan+Pl+Nom",
                "города\tгород+N+Msc+Inan+Pl+Acc", "города\tгород+N+Msc+Inan+Sg+Gen"));

        String resultAnalysesString = rusHfstAnalyser.runTransducer("города");

        final Set<String> resultAnalyses = new HashSet<>(Arrays.asList(resultAnalysesString.split("\n")));

        assertEquals(
                "There should be three readings for 'города'.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void estInputListResultNoReadings() throws Exception {
        String text = "KõIK";
        final ConvenientCas cas = uimaService.analyseText(text, aeTokenizer, Language.ESTONIAN);

        Collection<Token> analyserInputList = cas.select(Token.class);

        String expectedAnalyses = "KõIK\t+?\n";

        String resultAnalyses = estHfstAnalyser.runTransducer(analyserInputList);

        assertEquals(
                "There should be no readings for 'Kõik'.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void estInputListResultWithReadings() throws Exception {
        String text = "Kõik inimesed";
        final ConvenientCas cas = uimaService.analyseText(text, aeTokenizer, Language.RUSSIAN);

        Collection<Token> analyserInputList = cas.select(Token.class);

        String expectedAnalyses =
                "Kõik\tkõik+N+Sg+Nom\n" +
                "Kõik\tkõik+Pron+Sg+Nom\n" +
                "Kõik\tkõik+Pron+Pl+Nom\n" +
                "\n" +
                "inimesed\tinimene+N+Pl+Nom\n";

        String resultAnalyses = estHfstAnalyser.runTransducer(analyserInputList);

        assertEquals(
                "There should be three readings for 'Kõik' and one reading for 'inimesed'.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void estInputString() {
        String expectedAnalyses =
                "Kõik\tkõik+N+Sg+Nom\n" +
                "Kõik\tkõik+Pron+Sg+Nom\n" +
                "Kõik\tkõik+Pron+Pl+Nom\n";

        String resultAnalyses = estHfstAnalyser.runTransducer("Kõik");

        assertEquals(
                "There should be three readings for 'Kõik'.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void estInputStringCompound() {
        String expectedAnalyses =
                "võrdsetena\tvõrdne+A+prefix#sete+N+Sg+Nom#na+Adv\n" +
                "võrdsetena\tvõrdne+A+Pl+Ess\n" +
                "võrdsetena\tvõrd+Adv#sete+N+Sg+Nom#na+Adv\n";

        String resultAnalyses = estHfstAnalyser.runTransducer("võrdsetena");

        assertEquals(
                "There should be three readings for 'võrdsetena'.",
                expectedAnalyses,
                resultAnalyses);
    }
}
