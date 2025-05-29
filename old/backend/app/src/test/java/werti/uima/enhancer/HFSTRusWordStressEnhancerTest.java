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
 * @since 14.02.17
 */
public class HFSTRusWordStressEnhancerTest {
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
                createEngineDescription(HFSTRusWordStressEnhancer.class)
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
    public void excludeTokenHavingReadingsWithSENTFeature() throws Exception {
        String text = ".";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithCOMMAFeature() throws Exception {
        String text = ",";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithDASHFeature() throws Exception {
        String text = "-";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithLQUOTFeature() throws Exception {
        String text = "“";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithRQUOTFeature() throws Exception {
        String text = "”";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithQUOTFeature() throws Exception {
        String text = "\"";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithLPARFeature() throws Exception {
        String text = "(";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void excludeTokenHavingReadingsWithRPARFeature() throws Exception {
        String text = ")";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size()
        );
    }

    @Test
    public void ambiguity() throws Exception {
        String text = "родного";

        final List<Enhancement> expectedEnhancements = Collections.singletonList(
                new ViewEnhancement(0, 7)
                        .addAttribute("id", "VIEW-A-Neu-AnIn-Sg-Gen-1")
                        .addAttribute("lemma", "родный")
                        .addAttribute("correctForm", "ро́дного;родно́го")
                        .addAttribute("distractors", "ро́дного;родно́го;родного́")
                        .addAttribute("title", "ро́дного\n" +
                                " родный+A+Neu+AnIn+Sg+Gen\n" +
                                " родный+A+Msc+Anim+Sg+Acc\n" +
                                " родный+A+Msc+AnIn+Sg+Gen\n" +
                                "родно́го\n" +
                                " родной+A+Neu+AnIn+Sg+Gen\n" +
                                " родной+A+Msc+Anim+Sg+Acc\n" +
                                " родной+A+Msc+AnIn+Sg+Gen\n")
                        .addAttribute("type", "ambiguity")
                        .addAttribute("original-text", "родного")
        );

        assertEquals(
                "Should be an enhancement with stress ambiguity",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void regularHit() throws Exception {
        String text = "словам";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 6)
                        .addAttribute("id", "VIEW-N-Neu-Inan-Pl-Dat-1")
                        .addAttribute("lemma", "слово")
                        .addAttribute("correctForm", "слова́м" )
                        .addAttribute("distractors", "сло́вам;слова́м")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "словам")
        );

        assertEquals(
                "Should be a regular hit",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void unstressedWord() throws Exception {
        String text = "не";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 2)
                        .addAttribute("id", "VIEW-Pcle-1")
                        .addAttribute("lemma", "не")
                        .addAttribute("correctForm", "не" )
                        .addAttribute("title", "This word is unstressed!")
                        .addAttribute("type", "unstressed-word")
                        .addAttribute("original-text", "не")
        );

        assertEquals(
                "Should be a hit with unstressed-word type",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void lexiconMiss() throws Exception {
        String text = "MAMA";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-MAMA-1")
                        .addAttribute("title", "This word wasn't in the lexicon!")
                        .addAttribute("type", "lexicon-miss")
                        .addAttribute("original-text", "MAMA")
        );

        assertEquals(
                "Should be a hit with lexcion-miss type",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void mcTargetNounLoc2() throws Exception {
        String text = "саду";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-N-Msc-Inan-Sg-Loc2-1")
                        .addAttribute("lemma", "сад")
                        .addAttribute("correctForm", "саду́" )
                        .addAttribute("distractors", "са́ду;саду́")
                        .addAttribute("type", "mc-target")
                        .addAttribute("original-text", "саду")
                        .addAttribute("exemplar", "&lt;table&gt;&lt;tr&gt;&lt;td&gt;Case&lt;/td&gt;&lt;td&gt;Sg" +
                                "&lt;/td&gt;&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Nom&lt;/td&gt;" +
                                "&lt;td&gt;по́д&lt;/td&gt;&lt;td&gt;поды́&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Acc" +
                                "&lt;/td&gt;&lt;td&gt;по́д&lt;/td&gt;&lt;td&gt;поды́&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;Gen&lt;/td&gt;&lt;td&gt;по́да&lt;/td&gt;&lt;td&gt;подо́в&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Loc&lt;/td&gt;&lt;td&gt;по́де&lt;/td&gt;&lt;td&gt;пода́х" +
                                "&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Dat&lt;/td&gt;&lt;td&gt;по́ду&lt;/td&gt;" +
                                "&lt;td&gt;пода́м&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Ins&lt;/td&gt;&lt;td&gt;по́дом" +
                                "&lt;/td&gt;&lt;td&gt;пода́ми&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;")
                        .addAttribute("contClass", "м_c")
        );

        assertEquals(
                "Should be a mc-target",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void mcTargetAdjectivePred() throws Exception {
        String text = "должен";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 6)
                        .addAttribute("id", "VIEW-A-Msc-Sg-Pred-1")
                        .addAttribute("lemma", "должен")
                        .addAttribute("correctForm", "до́лжен" )
                        .addAttribute("distractors", "до́лжен;долже́н")
                        .addAttribute("type", "mc-target")
                        .addAttribute("original-text", "должен")
                        .addAttribute("exemplar", "&lt;table&gt;&lt;tr&gt;&lt;td&gt;Case&lt;/td&gt;&lt;td&gt;Msc" +
                                "&lt;/td&gt;&lt;td&gt;Neu&lt;/td&gt;&lt;td&gt;Fem&lt;/td&gt;&lt;td&gt;Pl&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Nom&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;" +
                                "&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;Acc/Inan&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;" +
                                "&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Acc/Anim&lt;/td&gt;" +
                                "&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Gen&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;" +
                                "&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;Loc&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;" +
                                "&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Dat&lt;/td&gt;" +
                                "&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Ins&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;" +
                                "&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;Short&lt;/td&gt;&lt;td&gt;до́лжен&lt;/td&gt;&lt;td&gt;должно́&lt;/td&gt;" +
                                "&lt;td&gt;должна́&lt;/td&gt;&lt;td&gt;должны́&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;Cmpar&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;td&gt;" +
                                "&lt;/td&gt;&lt;td&gt;&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;")
                        .addAttribute("contClass", "п_b~_пф_нет")
        );

        assertEquals(
                "Should be a mc-target",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void mcTargetPresentTense() throws Exception {
        String text = "происходят";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 10)
                        .addAttribute("id", "VIEW-V-Impf-IV-Prs-Pl3-1")
                        .addAttribute("lemma", "происходить")
                        .addAttribute("correctForm", "происхо́дят" )
                        .addAttribute("distractors", "происхо́дят;прои́сходят;происходя́т;про́исходят")
                        .addAttribute("type", "mc-target")
                        .addAttribute("original-text", "происходят")
                        .addAttribute("exemplar", "&lt;div&gt;Past:&lt;br&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;Gender" +
                                "&lt;/td&gt;&lt;td&gt;Form&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Msc&lt;/td&gt;" +
                                "&lt;td&gt;смотре́л&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Neu&lt;/td&gt;" +
                                "&lt;td&gt;смотре́ло&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Fem&lt;/td&gt;" +
                                "&lt;td&gt;смотре́ла&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Pl&lt;/td&gt;" +
                                "&lt;td&gt;смотре́ли&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;&lt;br&gt;Nonpast (Pres/Fut):" +
                                "&lt;br&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;Person&lt;/td&gt;&lt;td&gt;Sg&lt;/td&gt;" +
                                "&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;1&lt;/td&gt;&lt;td&gt;смотрю" +
                                "́&lt;/td&gt;&lt;td&gt;смо́трим&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;2&lt;/td&gt;" +
                                "&lt;td&gt;смо́тришь&lt;/td&gt;&lt;td&gt;смо́трите&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;3&lt;/td&gt;&lt;td&gt;смо́трит&lt;/td&gt;&lt;td&gt;смо́трят&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;/table&gt;&lt;br&gt;Imperative (command):&lt;/br&gt;&lt;table&gt;" +
                                "&lt;tr&gt;&lt;td&gt;Sg&lt;/td&gt;&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;смотри́&lt;/td&gt;&lt;td&gt;смотри́те&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;" +
                                "&lt;/div&gt;")
                        .addAttribute("contClass", "нсв_c")
        );

        assertEquals(
                "Should be a mc-target",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void mcTargetPastTense() throws Exception {
        String text = "сказал";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 6)
                        .addAttribute("id", "VIEW-V-Perf-IV-Pst-Msc-Sg-1")
                        .addAttribute("lemma", "сказать")
                        .addAttribute("correctForm", "сказа́л" )
                        .addAttribute("distractors", "сказа́л;ска́зал")
                        .addAttribute("type", "mc-target")
                        .addAttribute("original-text", "сказал")
                        .addAttribute("exemplar", "&lt;div&gt;Past:&lt;br&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;Gender" +
                                "&lt;/td&gt;&lt;td&gt;Form&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Msc&lt;/td&gt;" +
                                "&lt;td&gt;сказа́л&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Neu&lt;/td&gt;" +
                                "&lt;td&gt;сказа́ло&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Fem&lt;/td&gt;" +
                                "&lt;td&gt;сказа́ла&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Pl&lt;/td&gt;" +
                                "&lt;td&gt;сказа́ли&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;&lt;br&gt;Nonpast (Pres/Fut):" +
                                "&lt;br&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;Person&lt;/td&gt;&lt;td&gt;Sg&lt;/td&gt;" +
                                "&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;1&lt;/td&gt;&lt;td&gt;скажу" +
                                "́&lt;/td&gt;&lt;td&gt;ска́жем&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;2&lt;/td&gt;" +
                                "&lt;td&gt;ска́жешь&lt;/td&gt;&lt;td&gt;ска́жете&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;3&lt;/td&gt;&lt;td&gt;ска́жет&lt;/td&gt;&lt;td&gt;ска́жут&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;/table&gt;&lt;br&gt;Imperative (command):&lt;/br&gt;&lt;table&gt;" +
                                "&lt;tr&gt;&lt;td&gt;Sg&lt;/td&gt;&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;скажи́&lt;/td&gt;&lt;td&gt;скажи́те&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;" +
                                "&lt;/div&gt;")
                        .addAttribute("contClass", "св_c")
        );

        assertEquals(
                "Should be a mc-target",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void mcTargetFutureTense() throws Exception {
        String text = "будет";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 5)
                        .addAttribute("id", "VIEW-V-Impf-IV-Fut-Sg3-1")
                        .addAttribute("lemma", "быть")
                        .addAttribute("correctForm", "бу́дет" )
                        .addAttribute("distractors", "буде́т;бу́дет")
                        .addAttribute("type", "mc-target")
                        .addAttribute("original-text", "будет")
                        .addAttribute("exemplar", "&lt;div&gt;Past:&lt;br&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;Gender" +
                                "&lt;/td&gt;&lt;td&gt;Form&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Msc&lt;/td&gt;" +
                                "&lt;td&gt;бы́л&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Neu&lt;/td&gt;&lt;td&gt;бы́ло" +
                                "&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Fem&lt;/td&gt;&lt;td&gt;была́&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Pl&lt;/td&gt;&lt;td&gt;бы́ли&lt;/td&gt;&lt;/tr&gt;" +
                                "&lt;/table&gt;&lt;br&gt;Nonpast (Pres/Fut):&lt;br&gt;&lt;table&gt;&lt;tr&gt;" +
                                "&lt;td&gt;Person&lt;/td&gt;&lt;td&gt;Sg&lt;/td&gt;&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;" +
                                "&lt;tr&gt;&lt;td&gt;1&lt;/td&gt;&lt;td&gt;е́сть/бу́ду&lt;/td&gt;&lt;td&gt;е́сть/бу́дем" +
                                "&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;2&lt;/td&gt;&lt;td&gt;е́сть/бу́дешь" +
                                "&lt;/td&gt;&lt;td&gt;е́сть/бу́дете&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;3" +
                                "&lt;/td&gt;&lt;td&gt;е́сть/бу́дет&lt;/td&gt;&lt;td&gt;е́сть/бу́дут&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;/table&gt;&lt;br&gt;Imperative (command):&lt;/br&gt;&lt;table&gt;" +
                                "&lt;tr&gt;&lt;td&gt;Sg&lt;/td&gt;&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;бу́дь&lt;/td&gt;&lt;td&gt;бу́дьте&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;" +
                                "&lt;/div&gt;")
                        .addAttribute("contClass", "нсв_aORc")
        );

        assertEquals(
                "Should be a mc-target",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void mcTargetImperativeTense() throws Exception {
        String text = "скажи";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 5)
                        .addAttribute("id", "VIEW-V-Perf-IV-Imp-Sg2-1")
                        .addAttribute("lemma", "сказать")
                        .addAttribute("correctForm", "скажи́" )
                        .addAttribute("distractors", "ска́жи;скажи́")
                        .addAttribute("type", "mc-target")
                        .addAttribute("original-text", "скажи")
                        .addAttribute("exemplar", "&lt;div&gt;Past:&lt;br&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;Gender" +
                                "&lt;/td&gt;&lt;td&gt;Form&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Msc&lt;/td&gt;" +
                                "&lt;td&gt;сказа́л&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Neu&lt;/td&gt;" +
                                "&lt;td&gt;сказа́ло&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Fem&lt;/td&gt;" +
                                "&lt;td&gt;сказа́ла&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;Pl&lt;/td&gt;" +
                                "&lt;td&gt;сказа́ли&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;&lt;br&gt;Nonpast (Pres/Fut):" +
                                "&lt;br&gt;&lt;table&gt;&lt;tr&gt;&lt;td&gt;Person&lt;/td&gt;&lt;td&gt;Sg&lt;/td&gt;" +
                                "&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;1&lt;/td&gt;&lt;td&gt;скажу" +
                                "́&lt;/td&gt;&lt;td&gt;ска́жем&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;&lt;td&gt;2&lt;/td&gt;" +
                                "&lt;td&gt;ска́жешь&lt;/td&gt;&lt;td&gt;ска́жете&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;3&lt;/td&gt;&lt;td&gt;ска́жет&lt;/td&gt;&lt;td&gt;ска́жут&lt;/td&gt;" +
                                "&lt;/tr&gt;&lt;/table&gt;&lt;br&gt;Imperative (command):&lt;/br&gt;&lt;table&gt;" +
                                "&lt;tr&gt;&lt;td&gt;Sg&lt;/td&gt;&lt;td&gt;Pl&lt;/td&gt;&lt;/tr&gt;&lt;tr&gt;" +
                                "&lt;td&gt;скажи́&lt;/td&gt;&lt;td&gt;скажи́те&lt;/td&gt;&lt;/tr&gt;&lt;/table&gt;" +
                                "&lt;/div&gt;")
                        .addAttribute("contClass", "св_c")
        );

        assertEquals(
                "Should be a mc-target",
                expectedEnhancements,
                runTest(text)
        );
    }
}
