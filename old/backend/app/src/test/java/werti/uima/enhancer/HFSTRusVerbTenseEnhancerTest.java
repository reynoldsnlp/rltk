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
public class HFSTRusVerbTenseEnhancerTest {
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
                createEngineDescription(HFSTRusVerbTenseEnhancer.class)
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
        String text = "арестует";

        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 8)
                        .addAttribute("id", "VIEW-V-Impf-IV-Prs-Sg3-1")
                        .addAttribute("lemma", "арестовать")
                        .addAttribute("correctForm", "арестует")
                        .addAttribute("distractors", "арестует;арестую;арестуешь;арестуем;арестуют;арестуете")
                        .addAttribute("type", "ambiguity")
                        .addAttribute("filters", "Prs Fut")
                        .addAttribute("original-text", "арестует")
        );

        assertEquals(
                "Should be an enhancement with tense ambiguity",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPresentTense() throws Exception {
        String text = "вижу";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-V-Impf-IV-Prs-Sg1-1")
                        .addAttribute("lemma", "видеть")
                        .addAttribute("correctForm", "вижу" )
                        .addAttribute("distractors", "видит;видят;вижу;видим;видите;видишь")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Prs")
                        .addAttribute("original-text", "вижу")
        );

        assertEquals(
                "Should be a hit with present tense filter",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPastTense() throws Exception {
        String text = "повернула";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 9)
                        .addAttribute("id", "VIEW-V-Perf-IV-Pst-Fem-Sg-1")
                        .addAttribute("lemma", "повернуть")
                        .addAttribute("correctForm", "повернула" )
                        .addAttribute("distractors", "повернула;повернули;повернул;повернуло")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Pst")
                        .addAttribute("original-text", "повернула")
        );

        assertEquals(
                "Should be a hit with past tense filter",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitFutureTense() throws Exception {
        String text = "въедут";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 6)
                        .addAttribute("id", "VIEW-V-Perf-IV-Fut-Pl3-1")
                        .addAttribute("lemma", "въехать")
                        .addAttribute("correctForm", "въедут" )
                        .addAttribute("distractors", "въедем;въедете;въедешь;въедут;въедет;въеду")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Fut")
                        .addAttribute("original-text", "въедут")
        );

        assertEquals(
                "Should be a hit with future tense filter",
                expectedEnhancements,
                runTest(text)
        );
    }
}
