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
 * @since 07.02.17
 */
public class HFSTRusVerbEnhancerTest {
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
                createEngineDescription(HFSTRusVerbEnhancer.class)
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
        String text = "британской";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements, as the token is an adjective",
                0,
                enhancements.size());
    }

    @Test
    public void excludeTokenHavingReadingsWithNounFeature() throws Exception {
        String text = "Правила";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPstActFeature() throws Exception {
        String text = "двигавшаяся";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPstPssFeature() throws Exception {
        String text = "покрашенных";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPrsActFeature() throws Exception {
        String text = "глотающий";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPrsPssFeature() throws Exception {
        String text = "содержимое";
        Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void ambiguity() throws Exception {
        String text = "передает";

        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 8)
                        .addAttribute("id", "VIEW-V-Impf-IV-Prs-Sg3-1")
                        .addAttribute("lemma", "передавать¹")
                        .addAttribute("correctForm", "передаёт")
                        .addAttribute("distractors", "передаю;передают;передаёт;передаёшь;передаёте;передаём")
                        .addAttribute("type", "ambiguity")
                        .addAttribute("filters", "Impf Perf")
                        .addAttribute("original-text", "передает")
        );

        assertEquals(
                "Should be an enhancement with aspect ambiguity",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitImperfective() throws Exception {
        String text = "вижу";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-V-Impf-IV-Prs-Sg1-1")
                        .addAttribute("lemma", "видеть")
                        .addAttribute("correctForm", "вижу" )
                        .addAttribute("distractors", "видит;видят;вижу;видим;видите;видишь")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Impf")
                        .addAttribute("original-text", "вижу")
        );

        assertEquals(
                "Should be a hit with imperfective aspect filter.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPerfective() throws Exception {
        String text = "увижу";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 5)
                        .addAttribute("id", "VIEW-V-Perf-IV-Fut-Sg1-1")
                        .addAttribute("lemma", "увидеть")
                        .addAttribute("correctForm", "увижу" )
                        .addAttribute("distractors", "увижу;увидит;увидишь;увидим;увидите;увидят")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Perf")
                        .addAttribute("original-text", "увижу")
        );

        assertEquals(
                "Should be a hit with perfective aspect filter.",
                expectedEnhancements,
                runTest(text)
        );
    }
}
