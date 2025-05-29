package werti.util;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ae.OpenNlpTokenizer;
import werti.uima.ae.HFSTMalAnnotator;
import werti.uima.types.annot.CGToken;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;
import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 04.02.17
 */
public class RussianEnhancementCreatorTest {
    private UimaTestService uimaService;
    private AnalysisEngineDescription testPipe;
    private RussianEnhancementCreator russianEnhancementCreator;

    @Before
    public void loadAE() throws Exception {
        uimaService = new UimaTestService();
        testPipe = createEngineDescription(
                createEngineDescription(OpenNlpTokenizer.class),
                createEngineDescription(
                        HFSTMalAnnotator.class,
                        "isWithTrace",
                        Boolean.FALSE,
                        "language",
                        Language.RUSSIAN
                )
        );

        final RussianTestUtilities russianTestUtilities =
                new RussianTestUtilities(uimaService.getViewContext());
        russianEnhancementCreator = russianTestUtilities.getEnhancementCreator();
    }

    private Collection<CGToken> analyse(final String text) throws Exception {
        return uimaService
                .analyseText(text, testPipe, Language.RUSSIAN)
                .select(CGToken.class);
    }

    @Test
    public void commonEnhancementCorrectForm() throws Exception {
        Collection<CGToken> cgTokens = analyse("ребенком");

        CGToken cgToken = cgTokens.iterator().next();

        final Enhancement expected = new ViewEnhancement(0, 8)
                .addAttribute("id", "VIEW-N-Msc-Anim-Sg-Ins-1")
                .addAttribute("lemma", "ребёнок")
                .addAttribute("correctForm", "ребёнком" )
                .addAttribute("distractors", "ребёнок;ребёнке;ребёнком;ребёнку;ребёнка")
                .addAttribute("type", "hit")
                .addAttribute("filters", "Sg")
                .addAttribute("original-text", "ребенком");

        Map<String, MutableInt> idCounts = new HashMap<>();

        assertEquals(
                "Should have a correct form with \"ё\" instead of \"е\".",
                expected,
                russianEnhancementCreator.createCommonEnhancement(
                        cgToken,
                        idCounts,
                        "nouns",
                        Pattern.compile("Sg|Pl")
                )
        );
    }

    @Test
    public void commonEnhancementWithoutDistractorsAndAmbiguity() throws Exception {
        Collection<CGToken> cgTokens = analyse("передает");

        CGToken cgToken = cgTokens.iterator().next();

        final Enhancement expected = new ViewEnhancement(0, 8)
                .addAttribute("id", "VIEW-V-Impf-IV-Prs-Sg3-1")
                .addAttribute("lemma", "передавать¹")
                .addAttribute("correctForm", "передаёт")
                .addAttribute("type", "ambiguity")
                .addAttribute("filters", "Impf Perf")
                .addAttribute("original-text", "передает");

        Map<String, MutableInt> idCounts = new HashMap<>();

        assertEquals(
                "Should be an enhancement without distractors and type 'ambiguity'",
                expected,
                russianEnhancementCreator.createCommonEnhancement(
                        cgToken,
                        idCounts,
                        "nouns",
                        Pattern.compile("Impf|Perf")
                )
        );
    }

    @Test
    public void commonEnhancementWithDistractorsAndHit() throws Exception {
        Collection<CGToken> cgTokens = analyse("дочерей");

        CGToken cgToken = cgTokens.iterator().next();

        final Enhancement expected = new ViewEnhancement(0, 7)
                .addAttribute("id", "VIEW-N-Fem-Anim-Pl-Gen-1")
                .addAttribute("lemma", "дочь")
                .addAttribute("correctForm", "дочерей" )
                .addAttribute("distractors", "дочерями;дочерьми;дочерям;дочери;дочерей;дочерях")
                .addAttribute("type", "hit")
                .addAttribute("filters", "Pl")
                .addAttribute("original-text", "дочерей");

        Map<String, MutableInt> idCounts = new HashMap<>();

        assertEquals(
                "Should be an enhancement with distractors and type 'hit'",
                expected,
                russianEnhancementCreator.createCommonEnhancement(
                        cgToken,
                        idCounts,
                        "nouns",
                        Pattern.compile("Sg|Pl")
                )
        );
    }
}
