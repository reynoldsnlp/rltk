package werti.uima.ae.util;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.TestResourceFactory;
import werti.server.UimaTestService;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.types.annot.Token;
import werti.util.HFSTAnalyser;
import werti.util.HFSTAnalyserMal;

import java.io.IOException;
import java.util.Collection;
import java.util.List;

import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 12.12.16
 */
public class Vislcg3ProcessTest {
    private HFSTAnalyser rusHfstAnalyser;
    private HFSTAnalyserMal rusHfstAnalyserMal;
    private HFSTAnalyser estHfstAnalyser;
    private AnalysisEngineDescription aeTokenizer;
    private UimaTestService uimaService;
    private Vislcg3Process rusVislcg3Process;
    private Vislcg3Process estVislcg3Process;

    @Before
    public void loadAEAndHFSTAnalyser() throws Exception {
        aeTokenizer = AnalysisEngineFactory.createEngineDescription(OpenNlpTokenizer.class);
        uimaService = new UimaTestService();
        rusHfstAnalyser = initHfstAnalyser(Language.RUSSIAN);
        rusHfstAnalyserMal = new HFSTAnalyserMal(
                new TestResourceFactory(uimaService.getViewContext()),
                Language.RUSSIAN
        );
        estHfstAnalyser = initHfstAnalyser(Language.ESTONIAN);
        rusVislcg3Process = initVislcg3Process(Language.RUSSIAN);
        estVislcg3Process = initVislcg3Process(Language.ESTONIAN);
    }

    private HFSTAnalyser initHfstAnalyser(Language language) throws Exception {
        return new HFSTAnalyser(
                new TestResourceFactory(uimaService.getViewContext()),
                language
        );
    }

    private Vislcg3Process initVislcg3Process(Language language) throws Exception {
        return new Vislcg3Process(
                uimaService.getViewContext(),
                language
        );
    }

    private Collection<Token> tokenizeRus(String text) throws Exception {
        return uimaService.analyseText(text, aeTokenizer, Language.RUSSIAN)
                   .select(Token.class);
    }

    private Collection<Token> tokenizeEst(String text) throws Exception {
        return uimaService.analyseText(text, aeTokenizer, Language.ESTONIAN)
                .select(Token.class);
    }

    /**
     * This bug occurs if there is one input without readings. If this input is
     * passed to the runVislcg3 method then vislcg3 will return for e.g. "МАМА":
     *   "<МАМА>"
     *   "<+>"
     *   "<?>"
     * That's why this vislcg3 output is transformed inside of the runVislcg3 method
     * to the correct output. This is demonstrated in this test.
     */
    @Test
    public void withConversionAndDisambiguationWithOneInputWithoutReadingsBug() throws
            Exception {
        String text = "МАМА";
        Collection<Token> analyserInputList = tokenizeRus(text);

        String expectedAnalyses =
                "\"<МАМА>\"\n" +
                "\n";

        String analyses = rusHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList = rusVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "There should be no readings for this input.",
                expectedAnalyses,
                resultAnalyses);
    }

    /**
     * This test should check how a input without readings looks like when it
     * was NOT manually corrected like in the previous test for the case
     * vislcg3 corrects the bug in the future.
     */
    @Test
    public void withConversionAndDisambiguationWithOneWithoutReadings() throws
            Exception {
        String text = "МАМА играла";
        Collection<Token> analyserInputList = tokenizeRus(text);

        String expectedAnalyses =
                "\"<МАМА>\"\n" +
                "\"<играла>\"\n" +
                "\t\"играть\" V Impf IV Pst Fem Sg\n" +
                "\n";

        String analyses = rusHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList = rusVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"МАМА\" should have no readings and \"играла\" should have one reading.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void withRusConversionAndDisambiguation() throws
            Exception {
        String text = "в дом";
        Collection<Token> analyserInputList = tokenizeRus(text);

        String expectedAnalyses =
                "\"<в>\"\n" +
                "\t\"в\" Pr\n" +
                "\"<дом>\"\n" +
                "\t\"дом\" N Msc Inan Sg Acc\n" +
                "\n";

        String analyses = rusHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList = rusVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"в\" should have one reading and " +
                        "\"дом\" should have one reading as the other got removed.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void withRusConversionAndDisambiguationWithTrace() throws
            Exception {
        String text = "за дом";
        Collection<Token> analyserInputList = tokenizeRus(text);

        String expectedAnalyses =
                "\"<за>\"\n" +
                "\t\"за\" Pr\n" +
                "\"<дом>\"\n" +
                "\t\"дом\" N Msc Inan Sg Acc\n" +
                ";\t\"дом\" N Msc Inan Sg Nom \n" +
                "\n";

        String analyses = rusHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList = rusVislcg3Process.buildArgumentListConversionAndDisambiguationWithTrace();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"за\" should have one reading and " +
                        "\"дом\" should have one correct reading and " +
                        "one reading that is marked for removal.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void onlyWithRusDisambiguation() throws IOException, InterruptedException {
        String expectedAnalyses =
                "\"<в>\"\n" +
                "\t\"в\" Pr\n" +
                "\"<дом>\"\n" +
                "\t\"дом\" N Msc Inan Sg Acc\n" +
                "\n";

        String cg3FormatAnalyses =
                "\"<в>\"\n" +
                "\t\"в\" Pr\n" +
                "\"<дом>\"\n" +
                "\t\"дом\" N Msc Inan Sg Acc\n" +
                "\t\"дом\" N Msc Inan Sg Nom \n" +
                "\n";

        List<String> argumentList = rusVislcg3Process.buildArgumentListDisambiguation();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, cg3FormatAnalyses);

        assertEquals(
                "\"в\" should have one reading and " +
                        "\"дом\" should have one reading as the other got removed.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void withRusConversionAndDisambiguationWithMalRules() throws
            Exception {
        String text = "от отеца";
        Collection<Token> analyserInputList = tokenizeRus(text);

        String expectedAnalyses =
                "\"<от>\"\n" +
                "\t\"от\" Pr\n" +
                "\"<отеца>\"\n" +
                "\t\"отец\" N Msc Anim Sg Gen Err/L2_FV\n" +
                "\n";

        String analyses = rusHfstAnalyserMal.runTransducer(analyserInputList);

        List<String> argumentList = rusVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"от\" should have one reading and " +
                        "\"отеца\" should have one erroneous reading as the other got removed.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void withRusConversionAndDisambiguationWithTraceWithMalRules() throws
            Exception {
        String text = "от отеца";
        Collection<Token> analyserInputList = tokenizeRus(text);

        String expectedAnalyses =
                "\"<от>\"\n" +
                "\t\"от\" Pr\n" +
                "\"<отеца>\"\n" +
                "\t\"отец\" N Msc Anim Sg Gen Err/L2_FV\n" +
                ";\t\"отец\" N Msc Anim Sg Acc Err/L2_FV \n" +
                "\n";

        String analyses = rusHfstAnalyserMal.runTransducer(analyserInputList);

        List<String> argumentList = rusVislcg3Process.buildArgumentListConversionAndDisambiguationWithTrace();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"от\" should have one reading and " +
                        "\"отеца\" should have one erroneous reading and " +
                        "one erroneous reading that is marked for removal.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void onlyWithRusDisambiguationWithMalRules() throws IOException, InterruptedException {
        String expectedAnalyses =
                "\"<от>\"\n" +
                "\t\"от\" Pr\n" +
                "\"<отеца>\"\n" +
                "\t\"отец\" N Msc Anim Sg Gen Err/L2_FV\n" +
                "\n";

        String cg3FormatAnalyses =
                "\"<от>\"\n" +
                "\t\"от\" Pr\n" +
                "\"<отеца>\"\n" +
                "\t\"отец\" N Msc Anim Sg Gen Err/L2_FV\n" +
                "\t\"отец\" N Msc Anim Sg Acc Err/L2_FV \n" +
                "\n";

        List<String> argumentList = rusVislcg3Process.buildArgumentListDisambiguation();

        String resultAnalyses = rusVislcg3Process.runVislcg3(argumentList, cg3FormatAnalyses);

        assertEquals(
                "\"от\" should have one reading and " +
                        "\"отеца\" should have one erroneous reading as the other got removed.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void withEstConversionAndDisambiguationCompound() throws
            Exception {
        String text = "südametunnistus"; // TODO: Deal with compound words
        Collection<Token> analyserInputList = tokenizeEst(text);

        String expectedAnalyses =
                "\"<südametunnistus>\"\n" +
                "\t\"tunnistus\" N Sg Nom\n" +
                "\t\t\"süda\" N Sg Gen\n" +
                "\n";

        String analyses = estHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList = estVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String resultAnalyses = estVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"südametunnistus\" should have one compound reading.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void withEstConversionAndDisambiguation() throws
            Exception {
        String text = "Kõik inimesed";
        Collection<Token> analyserInputList = tokenizeEst(text);

        String expectedAnalyses =
                "\"<Kõik>\"\n" +
                "\t\"kõik\" Pron Pl Nom\n" +
                "\"<inimesed>\"\n" +
                "\t\"inimene\" N Pl Nom\n" +
                "\n";

        String analyses = estHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList = estVislcg3Process.buildArgumentListConversionAndDisambiguation();

        String resultAnalyses = estVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"Kõik\" should have one reading as the other two got removed and " +
                        "\"inimesed\" should have one reading.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void withEstConversionAndDisambiguationWithTrace() throws
            Exception {
        String text = "Kõik inimesed";
        Collection<Token> analyserInputList = tokenizeEst(text);

        String expectedAnalyses =
                "\"<Kõik>\"\n" +
                "\t\"kõik\" Pron Pl Nom \n" +
                ";\t\"kõik\" N Sg Nom \n" +
                ";\t\"kõik\" Pron Sg Nom \n" +
                "\"<inimesed>\"\n" +
                "\t\"inimene\" N Pl Nom\n" +
                "\n";

        String analyses = estHfstAnalyser.runTransducer(analyserInputList);

        List<String> argumentList = estVislcg3Process.buildArgumentListConversionAndDisambiguationWithTrace();

        String resultAnalyses = estVislcg3Process.runVislcg3(argumentList, analyses);

        assertEquals(
                "\"Kõik\" should have one correct reading and " +
                        "two readings marked for removal, " +
                        "\"inimesed\" should have one correct reading.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void onlyWithEstDisambiguation() throws IOException, InterruptedException {
        String expectedAnalyses =
                "\"<Kõik>\"\n" +
                "\t\"kõik\" Pron Pl Nom\n" +
                "\"<inimesed>\"\n" +
                "\t\"inimene\" N Pl Nom\n" +
                "\n";

        String cg3FormatAnalyses =
                "\"<Kõik>\"\n" +
                "\t\"kõik\" Pron Pl Nom \n" +
                "\t\"kõik\" N Sg Nom \n" +
                "\t\"kõik\" Pron Sg Nom \n" +
                "\"<inimesed>\"\n" +
                "\t\"inimene\" N Pl Nom\n" +
                "\n";

        List<String> argumentList = estVislcg3Process.buildArgumentListDisambiguation();

        String resultAnalyses = estVislcg3Process.runVislcg3(argumentList, cg3FormatAnalyses);

        assertEquals(
                "\"Kõik\" should have one reading as the other two got removed and " +
                        "\"inimesed\" should have one reading.",
                expectedAnalyses,
                resultAnalyses);
    }
}
