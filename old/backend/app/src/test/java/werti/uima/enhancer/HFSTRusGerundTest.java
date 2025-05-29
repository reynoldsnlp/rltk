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
 * @author Konnor Petersen
 * @since 20.08.19
 */
public class HFSTRusGerundTest {
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
                createEngineDescription(HFSTRusGerundEnhancer.class)
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
    public void excludeTokenHavingReadingsWithPcleFeature() throws Exception {
        String text = "ли";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithInterjFeature() throws Exception {
        String text = "есть";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithCCFeature() throws Exception {
        String text = "И";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithCSFeature() throws Exception {
        String text = "раз";
        final Collection<ViewEnhancement> enhancements = runTest(text);

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
    public void hitPresentActive() throws Exception {
        String text = "играя";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 5)
                        .addAttribute("id", "VIEW-V-Impf-IV-PrsAct-Adv-1")
                        .addAttribute("lemma", "играть")
                        .addAttribute("correctForm", "играя" )
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "PrsAct")
                        .addAttribute("original-text", "играя")
        );

        assertEquals(
                "Should be a hit with present active filter.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPastActive() throws Exception {
        String text = "написав";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 7)
                        .addAttribute("id", "VIEW-V-Perf-IV-PstAct-Adv-1")
                        .addAttribute("lemma", "написать¹")
                        .addAttribute("correctForm", "написав" )
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "PstAct")
                        .addAttribute("original-text", "написав")
        );

        assertEquals(
                "Should be a hit with past active filter.",
                expectedEnhancements,
                runTest(text)
        );
    }
}
