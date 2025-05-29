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
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 05.02.17
 */
public class HFSTRusAdjectiveEnhancerTest {
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
                createEngineDescription(HFSTRusAdjectiveEnhancer.class)
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
        String text = "дочерей";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements, as the input is a noun",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPredicateFeature() throws Exception {
        String text = "колонна";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void ambiguity() throws Exception {
        String text = "таможенного";

        final List<Enhancement> expectedEnhancements = Collections.singletonList(
                new ViewEnhancement(0, 11)
                        .addAttribute("id", "VIEW-A-Neu-AnIn-Sg-Gen-1")
                        .addAttribute("lemma", "таможенный")
                        .addAttribute("correctForm", "таможенного")
                        .addAttribute(
                                "distractors",
                                "таможенном;таможенный;таможенная;" +
                                "таможенному;таможенные;таможенных;" +
                                "таможенную;таможенной;таможенное;" +
                                "таможенным;таможенными;таможенного"
                        )
                        .addAttribute("type", "ambiguity")
                        .addAttribute("filters", "Msc Neu")
                        .addAttribute("original-text", "таможенного")
        );

        assertEquals(
                "Should be an enhancement with gender ambiguity",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitFeminine() throws Exception {
        String text = "британской";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 10)
                        .addAttribute("id", "VIEW-A-Fem-AnIn-Sg-Gen-1")
                        .addAttribute("lemma", "британский")
                        .addAttribute("correctForm", "британской" )
                        .addAttribute(
                                "distractors",
                                "британские;британских;британском;британскому;" +
                                        "британская;британскими;британскую;британской;" +
                                        "британское;британский;британского;британским"
                        )
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Fem")
                        .addAttribute("original-text", "британской")
        );

        assertEquals(
                "Should be a hit with feminine filter",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitMasculine() throws Exception {
        String text = "гуманитарный";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 12)
                        .addAttribute("id", "VIEW-A-Msc-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "гуманитарный")
                        .addAttribute("correctForm", "гуманитарный" )
                        .addAttribute(
                                "distractors",
                                "гуманитарному;гуманитарное;гуманитарного;" +
                                "гуманитарную;гуманитарной;гуманитарными;" +
                                "гуманитарные;гуманитарных;гуманитарным;" +
                                "гуманитарная;гуманитарный;гуманитарном"
                        )
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Msc")
                        .addAttribute("original-text", "гуманитарный")
        );

        assertEquals(
                "Should be a hit with masculine filter",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitNeutral() throws Exception {
        String text = "популярное";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 10)
                        .addAttribute("id", "VIEW-A-Neu-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "популярный")
                        .addAttribute("correctForm", "популярное" )
                        .addAttribute(
                                "distractors",
                                "популярное;популярного;популярными;" +
                                "популярные;популярных;популярному;" +
                                "популярную;популярной;популярном;" +
                                "популярный;популярная;популярным"
                        )
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Neu")
                        .addAttribute("original-text", "популярное")
        );

        assertEquals(
                "Should be a hit with neutral filter",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitMFN() throws Exception {
        String text = "вредные";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 7)
                        .addAttribute("id", "VIEW-A-MFN-AnIn-Pl-Nom-1")
                        .addAttribute("lemma", "вредный")
                        .addAttribute("correctForm", "вредные" )
                        .addAttribute(
                                "distractors",
                                "вредному;вредная;вредными;вредный;" +
                                "вредном;вредную;вредной;вредные;" +
                                "вредных;вредное;вредного;вредным"
                        )
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "MFN")
                        .addAttribute("original-text", "вредные")
        );

        assertEquals(
                "Should be a hit with MFN filter",
                expectedEnhancements,
                runTest(text)
        );
    }
}
