package werti.uima.ae;

import de.tudarmstadt.ukp.dkpro.core.api.segmentation.type.Sentence;
import de.tudarmstadt.ukp.dkpro.core.api.segmentation.type.Token;
import de.tudarmstadt.ukp.dkpro.core.opennlp.OpenNlpSegmenter;
import de.tudarmstadt.ukp.dkpro.core.rftagger.RfTagger;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.uima.ConvenientCas;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-05-28
 */
public class DKProRFTaggerTest {
    @Test
    public void processesAnythingAtAll() throws Exception {
        final UimaTestService uima = new UimaTestService();
        final Document input = Jsoup.parse("<p>Das ist</p><p>Inhalt.</p>");

        final String[] zoneTypes = { "werti.uima.types.annot.BlockText" };
        final AnalysisEngineDescription analysisEngine = createEngineDescription(
                createEngineDescription(
                        OpenNlpSegmenter.class,
                        OpenNlpSegmenter.PARAM_STRICT_ZONING, true,
                        OpenNlpSegmenter.PARAM_ZONE_TYPES, zoneTypes
                ),
                createEngineDescription(RfTagger.class)
        );

        final ConvenientCas cas = uima.analyseHtml(input, analysisEngine, Language.GERMAN);

        cas.select(Sentence.class).forEach(
                sentence -> System.out.println(sentence.getCoveredText())
        );

        cas.select(Token.class).forEach(
                token -> System.out.println(token.getMorph().toString())
        );
    }
}
