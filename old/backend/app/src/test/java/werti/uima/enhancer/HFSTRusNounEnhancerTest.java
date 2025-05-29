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

import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 15.12.16
 */
public class HFSTRusNounEnhancerTest {

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
                createEngineDescription(HFSTRusNounEnhancer.class)
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
                "Should have no enhancements, as the input is an adjective",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithVerbFeature() throws Exception {
        String text = "есть";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithAdjectiveFeature() throws Exception {
        String text = "колонна";
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
    public void excludeTokenHavingReadingsWithAdvFeature() throws Exception {
        String text = "Сегодня";
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
        String text = "раз";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithDetFeature() throws Exception {
        String text = "своими";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithPronFeature() throws Exception {
        String text = "этой";
        final Collection<ViewEnhancement> enhancements = runTest(text);

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
    public void ambiguity() throws Exception {
        String text = "города";

        final List<Enhancement> expectedEnhancements = Collections.singletonList(
                new ViewEnhancement(0, 6)
                        .addAttribute("id", "VIEW-N-Msc-Inan-Sg-Gen-1")
                        .addAttribute("lemma", "город")
                        .addAttribute("correctForm", "города")
                        .addAttribute("distractors", "город;городом;города;городу;городе")
                        .addAttribute("type", "ambiguity")
                        .addAttribute("filters", "Sg Pl")
                        .addAttribute("original-text", "города")
        );

        assertEquals(
                "Should be an enhancement with number ambiguity",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitSingular() throws Exception {
        String text = "доме";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-N-Msc-Inan-Sg-Loc-1")
                        .addAttribute("lemma", "дом")
                        .addAttribute("correctForm", "доме" )
                        .addAttribute("distractors", "дом;дома;дому;домом;доме")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Sg")
                        .addAttribute("original-text", "доме")
        );

        assertEquals(
                "Should be a hit with singular filter",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPlural() throws Exception {
        String text = "дочерей";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 7)
                        .addAttribute("id", "VIEW-N-Fem-Anim-Pl-Acc-1")
                        .addAttribute("lemma", "дочь")
                        .addAttribute("correctForm", "дочерей" )
                        .addAttribute("distractors", "дочерями;дочерьми;дочерям;дочери;дочерей;дочерях")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Pl")
                        .addAttribute("original-text", "дочерей")
        );

        assertEquals(
                "Should be a hit with plural filter",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void withClue() throws Exception {
        String text = "с девочкой";

        List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 1)
                        .addAttribute("id", "VIEW-Pr-1")
                        .addAttribute("type", "clue")
                        .addAttribute("original-text", "с"),
                new ViewEnhancement(2, 10)
                        .addAttribute("id", "VIEW-N-Fem-Anim-Sg-Ins-1")
                        .addAttribute("lemma", "девочка")
                        .addAttribute("clueid", "VIEW-Pr-1")
                        .addAttribute("correctForm", "девочкой")
                        .addAttribute("distractors", "девочка;девочку;девочке;девочки;девочкой")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Sg")
                        .addAttribute("original-text", "девочкой")
        );

        assertEquals(
                "Should contain the clueid of the viewcluetag",
                expectedEnhancements,
                runTest(text));
    }

    @Test
    public void stillWithClue() throws Exception {
        String text = "с доброй девочкой";

        List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 1)
                        .addAttribute("id", "VIEW-Pr-1")
                        .addAttribute("type", "clue")
                        .addAttribute("original-text", "с"),
                new ViewEnhancement(9, 17)
                        .addAttribute("id", "VIEW-N-Fem-Anim-Sg-Ins-1")
                        .addAttribute("lemma", "девочка")
                        .addAttribute("clueid", "VIEW-Pr-1")
                        .addAttribute("correctForm", "девочкой")
                        .addAttribute("distractors", "девочка;девочку;девочке;девочки;девочкой")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Sg")
                        .addAttribute("original-text", "девочкой")
        );

        assertEquals(
                "Should still contain the clueid of the viewcluetag, " +
                        "as 'доброй' doesn't break the connection",
                expectedEnhancements,
                runTest(text));
    }

    @Test
    public void clueIgnored() throws Exception {
        String text = "с. девочкой";

        List<Enhancement> expectedEnhancements = Arrays.asList(
                new ViewEnhancement(0, 1)
                        .addAttribute("id", "VIEW-Pr-1")
                        .addAttribute("type", "clue")
                        .addAttribute("original-text", "с"),
                new ViewEnhancement(3, 11)
                        .addAttribute("id", "VIEW-N-Fem-Anim-Sg-Ins-1")
                        .addAttribute("lemma", "девочка")
                        .addAttribute("correctForm", "девочкой")
                        .addAttribute("distractors", "девочка;девочку;девочке;девочки;девочкой")
                        .addAttribute("type", "hit")
                        .addAttribute("filters", "Sg")
                        .addAttribute("original-text", "девочкой")
        );

        assertEquals(
                "Shouldn't contain the clueid of the viewcluetag, " +
                        "as '.' breaks the connection",
                expectedEnhancements,
                runTest(text));
    }
}
