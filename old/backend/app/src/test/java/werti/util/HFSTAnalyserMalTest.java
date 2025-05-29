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

import java.util.Collection;

import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 15.12.16
 */
public class HFSTAnalyserMalTest {

    private static HFSTAnalyserMal hfstAnalyserMal;

    private AnalysisEngineDescription aeTokenizer;
    private UimaTestService uimaService;

    @Before
    public void loadAEAndHFSTAnalyser() throws Exception {
        aeTokenizer = AnalysisEngineFactory.createEngineDescription(OpenNlpTokenizer.class);
        uimaService = new UimaTestService();
        hfstAnalyserMal = new HFSTAnalyserMal(
                new TestResourceFactory(uimaService.getViewContext()),
                Language.RUSSIAN
        );
    }

    @Test
    public void inputListResultNoReadings() throws Exception {
        String text = "зимла";
        final ConvenientCas cas = uimaService.analyseText(text, aeTokenizer, Language.RUSSIAN);

        Collection<Token> analyserInputList = cas.select(Token.class);

        String expectedAnalyses = "зимла\t+?\n";

        String resultAnalyses = hfstAnalyserMal.runTransducer(analyserInputList);

        assertEquals(
                "There should be no readings for 'зимла' as there are too many errors.",
                expectedAnalyses,
                resultAnalyses
        );
    }

    @Test
    public void inputListResultWithReadingsErr_L2_FV() throws Exception {
        String text = "Отецы любят дети";
        final ConvenientCas cas = uimaService.analyseText(text, aeTokenizer, Language.RUSSIAN);

        Collection<Token> analyserInputList = cas.select(Token.class);

        String expectedAnalyses =
                "Отецы\tотец+N+Msc+Anim+Pl+Nom+Err/L2_FV\n" +
                "\n" +
                "любят\tлюбить+V+Impf+IV+Prs+Pl3\n" +
                "любят\tлюбить+V+Impf+TV+Prs+Pl3\n" +
                "\n" +
                "дети\tребёнок+N+Msc+Anim+Pl+Nom\n" +
                "дети\tдитя+N+Neu+Anim+Pl+Nom\n";

        String resultAnalyses = hfstAnalyserMal.runTransducer(analyserInputList);

        assertEquals(
                "The reading for 'Отецы' should contain an unnecessary fleeting vowel.",
                expectedAnalyses,
                resultAnalyses
        );
    }

    @Test
    public void inputStringErr_L2_Pal() {
        String expectedAnalyses =
                "земла\tземля+N+Fem+Inan+Sg+Nom+Err/L2_Pal\n";

        String resultAnalyses = hfstAnalyserMal.runTransducer("земла");

        assertEquals(
                "There should a wrong vowel placed after a soft stem.",
                expectedAnalyses,
                resultAnalyses);
    }

    @Test
    public void inputStringErr_L2_NoFV() {
        String expectedAnalyses =
                "окн\tокно+N+Neu+Inan+Pl+Gen+Err/L2_NoFV\n";

        String resultAnalyses = hfstAnalyserMal.runTransducer("окн");

        assertEquals(
                "There should be a missing fleeting vowel.",
                expectedAnalyses,
                resultAnalyses);
    }
}
