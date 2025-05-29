package werti.uima.enhancer;

import com.google.common.collect.ImmutableList;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.types.EnhancementAnnotation;

import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 13.02.17
 */
public class HFSTRusParticipleEnhancerTest {
    private AnalysisEngineDescription testPipe;
    private UimaTestService uimaService;

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
                createEngineDescription(HFSTRusParticipleEnhancer.class)
        );
    }

    private List<ViewEnhancement> runTest(final String text) throws Exception {
        return uimaService
                .analyseText(text, testPipe, Language.RUSSIAN)
                .select(EnhancementAnnotation.class)
                .stream()
                .map(ViewEnhancement::new)
                .collect(Collectors.toList());
    }

    @Test
    public void ignoreToken() throws Exception {
        String text = "и";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements, as the token is a coordinating conjunction",
                0,
                enhancements.size());
    }

    @Test
    public void excludeTokenHavingReadingsWithNounFeature() throws Exception {
        String text = "достигнутому";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithAdjectiveFeature() throws Exception {
        String text = "согласован";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithDetFeature() throws Exception {
        String text = "данных";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPronFeature() throws Exception {
        String text = "данных";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPredFeature() throws Exception {
        String text = "согласован";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithAdvFeature() throws Exception {
        String text = "добавив";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void hitPresentActive() throws Exception {
        String text = "глотающий";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 9)
                        .addAttribute("id", "VIEW-V-Impf-IV-PrsAct-Msc-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "глотать")
                        .addAttribute("correctForm", "глотающий" )
                        .addAttribute("distractors", "глотающий;проглотивший")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "PrsAct")
                        .addAttribute("original-text", "глотающий")
                        .addAttribute("rephrase", "который глотает")
        );

        assertEquals(
                "Should be a hit with present active filter and rephrase.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPresentPassive() throws Exception {
        String text = "глотаемый";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 9)
                        .addAttribute("id", "VIEW-V-Impf-TV-Der-Der/PrsPss-A-Msc-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "глотать")
                        .addAttribute("correctForm", "глотаемый" )
                        .addAttribute("distractors", "глотающий;проглотивший;глотаемый;проглоченный")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "PrsPss")
                        .addAttribute("original-text", "глотаемый")
        );

        assertEquals(
                "Should be a hit with present passive filter and rephrase.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPastActive() throws Exception {
        String text = "проглотивший";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 12)
                        .addAttribute("id", "VIEW-V-Perf-IV-PstAct-Msc-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "проглотить")
                        .addAttribute("correctForm", "проглотивший" )
                        .addAttribute("distractors", "глотающий;проглотивший")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "PstAct")
                        .addAttribute("original-text", "проглотивший")
                        .addAttribute("rephrase", "который проглотил")
        );

        assertEquals(
                "Should be a hit with past active filter and rephrase.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPastPassive() throws Exception {
        String text = "проглоченный";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 12)
                        .addAttribute("id", "VIEW-V-Perf-TV-Der-Der/PstPss-A-Msc-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "проглотить")
                        .addAttribute("correctForm", "проглоченный" )
                        .addAttribute("distractors", "глотающий;проглотивший;глотаемый;проглоченный")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "PstPss")
                        .addAttribute("original-text", "проглоченный")
        );

        assertEquals(
                "Should be a hit with past passive filter and rephrase.",
                expectedEnhancements,
                runTest(text)
        );
    }
}
