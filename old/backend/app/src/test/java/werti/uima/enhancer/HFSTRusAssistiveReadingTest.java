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
public class HFSTRusAssistiveReadingTest {
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
                createEngineDescription(HFSTRusAssistiveReadingEnhancer.class)
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
        String text = "island";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        assertEquals(
                "Should have no enhancements",
                0,
                enhancements.size());
    }

    @Test
    public void hitNoun() throws Exception {
        String text = "достигнутому";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 12)
                        .addAttribute("id", "VIEW-N-Neu-Inan-Sg-Dat-1")
                        .addAttribute("lemma", "достигнутое")
                        .addAttribute("stressed-lemma", "дости́гнутое")
                        .addAttribute("correct-form", "дости́гнутому" )
                        .addAttribute("correct-reading", "достигнутое+N+Neu+Inan+Sg+Dat")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "достигнутому")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,достигнутое+N+Neu+Inan+Sg+Nom:дости́гнутое,достигнутое+N+Neu+Inan+Sg+Acc:дости́гнутое,достигнутое+N+Neu+Inan+Sg+Loc2,достигнутое+N+Neu+Inan+Sg+Gen2,достигнутое+N+Neu+Inan+Sg+Gen:дости́гнутого,достигнутое+N+Neu+Inan+Sg+Loc:дости́гнутом,достигнутое+N+Neu+Inan+Sg+Dat:дости́гнутому,достигнутое+N+Neu+Inan+Sg+Ins:дости́гнутым,достигнутое+N+Neu+Inan+Sg+Voc,достигнутое+N+Neu+Inan+Pl+Nom:дости́гнутые,достигнутое+N+Neu+Inan+Pl+Acc:дости́гнутые,достигнутое+N+Neu+Inan+Pl+Loc2,достигнутое+N+Neu+Inan+Pl+Gen2,достигнутое+N+Neu+Inan+Pl+Gen:дости́гнутых,достигнутое+N+Neu+Inan+Pl+Loc:дости́гнутых,достигнутое+N+Neu+Inan+Pl+Dat:дости́гнутым,достигнутое+N+Neu+Inan+Pl+Ins:дости́гнутыми,достигнутое+N+Neu+Inan+Pl+Voc,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitAdjective() throws Exception {
        String text = "согласован";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 10)
                        .addAttribute("id", "VIEW-A-Msc-Sg-Pred-1")
                        .addAttribute("lemma", "согласованный")
                        .addAttribute("stressed-lemma", "согласо́ванный")
                        .addAttribute("correct-form", "согласо́ван" )
                        .addAttribute("correct-reading", "согласованный+A+Msc+Sg+Pred")
                        .addAttribute("translation", "coordinated, concerted, consensual")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "согласован")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,согласованный+A+Msc+AnIn+Sg+Nom:согласо́ванный,согласованный+A+Msc+AnIn+Sg+Acc,согласованный+A+Msc+Anim+Sg+Acc:согласо́ванного,согласованный+A+Msc+Inan+Sg+Acc:согласо́ванный,согласованный+A+Msc+AnIn+Sg+Gen:согласо́ванного,согласованный+A+Msc+AnIn+Sg+Loc:согласо́ванном,согласованный+A+Msc+AnIn+Sg+Dat:согласо́ванному,согласованный+A+Msc+AnIn+Sg+Ins:согласо́ванным,согласованный+A+Msc+AnIn+Sg+Ins+Leng,согласованный+A+Msc+Sg+Pred:согласо́ван,согласованный+A+Neu+AnIn+Sg+Nom:согласо́ванное,согласованный+A+Neu+AnIn+Sg+Acc:согласо́ванное,согласованный+A+Neu+Anim+Sg+Acc,согласованный+A+Neu+Inan+Sg+Acc,согласованный+A+Neu+AnIn+Sg+Gen:согласо́ванного,согласованный+A+Neu+AnIn+Sg+Loc:согласо́ванном,согласованный+A+Neu+AnIn+Sg+Dat:согласо́ванному,согласованный+A+Neu+AnIn+Sg+Ins:согласо́ванным,согласованный+A+Neu+AnIn+Sg+Ins+Leng,согласованный+A+Neu+Sg+Pred:согласо́ванно,согласованный+A+Fem+AnIn+Sg+Nom:согласо́ванная,согласованный+A+Fem+AnIn+Sg+Acc:согласо́ванную,согласованный+A+Fem+Anim+Sg+Acc,согласованный+A+Fem+Inan+Sg+Acc,согласованный+A+Fem+AnIn+Sg+Gen:согласо́ванной,согласованный+A+Fem+AnIn+Sg+Loc:согласо́ванной,согласованный+A+Fem+AnIn+Sg+Dat:согласо́ванной,согласованный+A+Fem+AnIn+Sg+Ins:согласо́ванной,согласованный+A+Fem+AnIn+Sg+Ins+Leng:согласо́ванною,согласованный+A+Fem+Sg+Pred:согласо́ванна,согласованный+A+MFN+AnIn+Pl+Nom:согласо́ванные,согласованный+A+MFN+AnIn+Pl+Acc,согласованный+A+MFN+Anim+Pl+Acc:согласо́ванных,согласованный+A+MFN+Inan+Pl+Acc:согласо́ванные,согласованный+A+MFN+AnIn+Pl+Gen:согласо́ванных,согласованный+A+MFN+AnIn+Pl+Loc:согласо́ванных,согласованный+A+MFN+AnIn+Pl+Dat:согласо́ванным,согласованный+A+MFN+AnIn+Pl+Ins:согласо́ванными,согласованный+A+MFN+AnIn+Pl+Ins+Leng,согласованный+A+MFN+Pl+Pred:согласо́ванны,согласованный+A+Cmpar+Pred:согласо́ваннее,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }


    @Test
    public void hitVerb() throws Exception {
        String text = "прочитают";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 9)
                        .addAttribute("id", "VIEW-V-Perf-IV-Fut-Pl3-1")
                        .addAttribute("lemma", "прочитать")
                        .addAttribute("stressed-lemma", "прочита́ть")
                        .addAttribute("correct-form", "прочита́ют" )
                        .addAttribute("correct-reading", "прочитать+V+Perf+IV+Fut+Pl3")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "to read, to read through; to recite")
                        .addAttribute("original-text", "прочитают")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,прочитать+V+Perf+IV+Fut+Sg1:прочита́ю,прочитать+V+Perf+IV+Fut+Sg2:прочита́ешь,прочитать+V+Perf+IV+Fut+Sg3:прочита́ет,прочитать+V+Perf+IV+Fut+Pl1:прочита́ем,прочитать+V+Perf+IV+Fut+Pl2:прочита́ете,прочитать+V+Perf+IV+Fut+Pl3:прочита́ют,прочитать+V+Perf+IV+Pst+Msc+Sg:прочита́л,прочитать+V+Perf+IV+Pst+Neu+Sg:прочита́ло,прочитать+V+Perf+IV+Pst+Fem+Sg:прочита́ла,прочитать+V+Perf+IV+Pst+MFN+Pl:прочита́ли,прочитать+V+Perf+IV+Imp+Sg2:прочита́й,прочитать+V+Perf+IV+Imp+Pl2:прочита́йте,прочитать+V+Perf+IV+Inf:прочита́ть,прочитать+V+Perf+IV+PrsAct+Adv,прочитать+V+Perf+IV+PstAct+Adv:прочита́в,прочитать+V+Perf+IV+PrsAct+Msc+AnIn+Sg+Nom,прочитать+V+Perf+IV+PrsPss+Msc+AnIn+Sg+Nom,прочитать+V+Perf+IV+PstAct+Msc+AnIn+Sg+Nom:прочита́вший,прочитать+V+Perf+IV+PstPss+Msc+AnIn+Sg+Nom,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPron() throws Exception {
        String text = "тебе";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-Pron-Pers-Sg2-Dat-1")
                        .addAttribute("lemma", "ты")
                        .addAttribute("stressed-lemma", "ты́")
                        .addAttribute("correct-form", "тебе́")
                        .addAttribute("correct-reading", "ты+Pron+Pers+Sg2+Dat")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "second-person singular, nominative case: you, thou")
                        .addAttribute("original-text", "тебе")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,ты+Pron+Pers+Sg2+Nom:ты́,ты+Pron+Pers+Sg2+Acc:тебя́,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    /*@Test  TODO fix this test
    public void hitDet() throws Exception {
        String text = "всякий";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 6)
                        .addAttribute("id", "VIEW-Pron-Msc-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "всякий")
                        .addAttribute("stressed-lemma", "вся́кий")
                        .addAttribute("correct-form", "вся́кий" )
                        .addAttribute("correct-reading", "всякий+Pron+Msc+AnIn+Sg+Nom")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "anybody, anyone, everybody, everyone; anything")
                        .addAttribute("original-text", "всякий")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,всякий+Det+Msc+AnIn+Sg+Nom:вся́кий,всякий+Det+Msc+AnIn+Sg+Acc,всякий+Det+Msc+Anim+Sg+Acc:вся́кого,всякий+Det+Msc+Inan+Sg+Acc:вся́кий,всякий+Det+Msc+AnIn+Sg+Gen:вся́кого,всякий+Det+Msc+AnIn+Sg+Loc:вся́ком,всякий+Det+Msc+AnIn+Sg+Dat:вся́кому,всякий+Det+Msc+AnIn+Sg+Ins:вся́ким,всякий+Det+Msc+AnIn+Sg+Ins+Leng,всякий+Det+Neu+AnIn+Sg+Nom:вся́кое,всякий+Det+Neu+AnIn+Sg+Acc:вся́кое,всякий+Det+Neu+Anim+Sg+Acc,всякий+Det+Neu+Inan+Sg+Acc,всякий+Det+Neu+AnIn+Sg+Gen:вся́кого,всякий+Det+Neu+AnIn+Sg+Loc:вся́ком,всякий+Det+Neu+AnIn+Sg+Dat:вся́кому,всякий+Det+Neu+AnIn+Sg+Ins:вся́ким,всякий+Det+Neu+AnIn+Sg+Ins+Leng,всякий+Det+Fem+AnIn+Sg+Nom:вся́кая,всякий+Det+Fem+AnIn+Sg+Acc:вся́кую,всякий+Det+Fem+Anim+Sg+Acc,всякий+Det+Fem+Inan+Sg+Acc,всякий+Det+Fem+AnIn+Sg+Gen:вся́кой,всякий+Det+Fem+AnIn+Sg+Loc:вся́кой,всякий+Det+Fem+AnIn+Sg+Dat:вся́кой,всякий+Det+Fem+AnIn+Sg+Ins:вся́кой,всякий+Det+Fem+AnIn+Sg+Ins+Leng:вся́кою,всякий+Det+MFN+AnIn+Pl+Nom:вся́кие,всякий+Det+MFN+AnIn+Pl+Acc,всякий+Det+MFN+Anim+Pl+Acc:вся́ких,всякий+Det+MFN+Inan+Pl+Acc:вся́кие,всякий+Det+MFN+AnIn+Pl+Gen:вся́ких,всякий+Det+MFN+AnIn+Pl+Loc:вся́ких,всякий+Det+MFN+AnIn+Pl+Dat:вся́ким,всякий+Det+MFN+AnIn+Pl+Ins:вся́кими,всякий+Det+MFN+AnIn+Pl+Ins+Leng,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }*/

    @Test
    public void hitNum() throws Exception {
        String text = "двух";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-Num-Msc-Anim-Acc-1")
                        .addAttribute("lemma", "два")
                        .addAttribute("stressed-lemma", "два́")
                        .addAttribute("correct-form", "дву́х" )
                        .addAttribute("correct-reading", "два+Num+Msc+Anim+Acc")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "two (2)")
                        .addAttribute("original-text", "двух")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,два+Num+Msc+AnIn+Nom:два́,два+Num+Msc+AnIn+Acc,два+Num+Msc+Anim+Acc:дву́х,два+Num+Msc+Inan+Acc:два́,два+Num+Msc+AnIn+Gen,два+Num+Msc+AnIn+Loc,два+Num+Msc+AnIn+Dat,два+Num+Msc+AnIn+Ins,два+Num+Msc+AnIn+Ins+Leng,два+Num+Neu+AnIn+Nom:два́,два+Num+Neu+AnIn+Acc:два́,два+Num+Neu+Anim+Acc,два+Num+Neu+Inan+Acc,два+Num+Neu+AnIn+Gen,два+Num+Neu+AnIn+Loc,два+Num+Neu+AnIn+Dat,два+Num+Neu+AnIn+Ins,два+Num+Neu+AnIn+Ins+Leng,два+Num+Fem+AnIn+Nom:две́,два+Num+Fem+AnIn+Acc,два+Num+Fem+Anim+Acc:две́,два+Num+Fem+Inan+Acc:две́,два+Num+Fem+AnIn+Gen,два+Num+Fem+AnIn+Loc,два+Num+Fem+AnIn+Dat,два+Num+Fem+AnIn+Ins,два+Num+Fem+AnIn+Ins+Leng,два+Num+MFN+AnIn+Nom,два+Num+MFN+AnIn+Acc,два+Num+MFN+Anim+Acc,два+Num+MFN+Inan+Acc,два+Num+MFN+AnIn+Gen:дву́х,два+Num+MFN+AnIn+Loc:дву́х,два+Num+MFN+AnIn+Dat:дву́м,два+Num+MFN+AnIn+Ins:двумя́,два+Num+MFN+AnIn+Ins+Leng,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitOrdNum() throws Exception {
        String text = "второго";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 7)
                        .addAttribute("id", "VIEW-N-Neu-Inan-Sg-Gen-1")
                        .addAttribute("lemma", "второе")
                        .addAttribute("stressed-lemma", "второ́е")
                        .addAttribute("correct-form", "второ́го" )
                        .addAttribute("correct-reading", "второе+N+Neu+Inan+Sg+Gen")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "second course (meal); secondly, used as во-вторы́х; the second (in dates)")
                        .addAttribute("original-text", "второго")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,второе+N+Neu+Inan+Sg+Nom:второ́е,второе+N+Neu+Inan+Sg+Acc:второ́е,второе+N+Neu+Inan+Sg+Loc2,второе+N+Neu+Inan+Sg+Gen2,второе+N+Neu+Inan+Sg+Gen:второ́го,второе+N+Neu+Inan+Sg+Loc:второ́м,второе+N+Neu+Inan+Sg+Dat:второ́му,второе+N+Neu+Inan+Sg+Ins:вторы́м,второе+N+Neu+Inan+Sg+Voc,второе+N+Neu+Inan+Pl+Nom:вторы́е,второе+N+Neu+Inan+Pl+Acc:вторы́е,второе+N+Neu+Inan+Pl+Loc2,второе+N+Neu+Inan+Pl+Gen2,второе+N+Neu+Inan+Pl+Gen:вторы́х,второе+N+Neu+Inan+Pl+Loc:вторы́х,второе+N+Neu+Inan+Pl+Dat:вторы́м,второе+N+Neu+Inan+Pl+Ins:вторы́ми,второе+N+Neu+Inan+Pl+Voc,ñôŃßĘńŠēPARADIGMEND,ñôŃßĘńŠēNEWPARADIGM,второй+Num+Ord+Neu+AnIn+Sg+Nom:второ́е,второй+Num+Ord+Neu+AnIn+Sg+Acc:второ́е,второй+Num+Ord+Neu+Anim+Sg+Acc,второй+Num+Ord+Neu+Inan+Sg+Acc,второй+Num+Ord+Neu+AnIn+Sg+Gen:второ́го,второй+Num+Ord+Neu+AnIn+Sg+Loc:второ́м,второй+Num+Ord+Neu+AnIn+Sg+Dat:второ́му,второй+Num+Ord+Neu+AnIn+Sg+Ins:вторы́м,второй+Num+Ord+Neu+AnIn+Sg+Ins+Leng,второй+Num+Ord+Msc+AnIn+Sg+Nom:второ́й,второй+Num+Ord+Msc+AnIn+Sg+Acc,второй+Num+Ord+Msc+Anim+Sg+Acc:второ́го,второй+Num+Ord+Msc+Inan+Sg+Acc:второ́й,второй+Num+Ord+Msc+AnIn+Sg+Gen:второ́го,второй+Num+Ord+Msc+AnIn+Sg+Loc:второ́м,второй+Num+Ord+Msc+AnIn+Sg+Dat:второ́му,второй+Num+Ord+Msc+AnIn+Sg+Ins:вторы́м,второй+Num+Ord+Msc+AnIn+Sg+Ins+Leng,второй+Num+Ord+Fem+AnIn+Sg+Nom:втора́я,второй+Num+Ord+Fem+AnIn+Sg+Acc:втору́ю,второй+Num+Ord+Fem+Anim+Sg+Acc,второй+Num+Ord+Fem+Inan+Sg+Acc,второй+Num+Ord+Fem+AnIn+Sg+Gen:второ́й,второй+Num+Ord+Fem+AnIn+Sg+Loc:второ́й,второй+Num+Ord+Fem+AnIn+Sg+Dat:второ́й,второй+Num+Ord+Fem+AnIn+Sg+Ins:второ́й,второй+Num+Ord+Fem+AnIn+Sg+Ins+Leng:второ́ю,второй+Num+Ord+MFN+AnIn+Pl+Nom:вторы́е,второй+Num+Ord+MFN+AnIn+Pl+Acc,второй+Num+Ord+MFN+Anim+Pl+Acc:вторы́х,второй+Num+Ord+MFN+Inan+Pl+Acc:вторы́е,второй+Num+Ord+MFN+AnIn+Pl+Gen:вторы́х,второй+Num+Ord+MFN+AnIn+Pl+Loc:вторы́х,второй+Num+Ord+MFN+AnIn+Pl+Dat:вторы́м,второй+Num+Ord+MFN+AnIn+Pl+Ins:вторы́ми,второй+Num+Ord+MFN+AnIn+Pl+Ins+Leng,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitAbbr() throws Exception {
        String text = "PS";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 2)
                        .addAttribute("id", "VIEW-Abbr-1")
                        .addAttribute("lemma", "PS")
                        .addAttribute("stressed-lemma", "PS")
                        .addAttribute("correct-form", "PS" )
                        .addAttribute("correct-reading", "PS+Abbr")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "PS")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitAdv() throws Exception {
        String text = "добавив";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 7)
                        .addAttribute("id", "VIEW-V-Perf-IV-PstAct-Adv-1")
                        .addAttribute("lemma", "добавить")
                        .addAttribute("stressed-lemma", "доба́вить")
                        .addAttribute("correct-form", "доба́вив" )
                        .addAttribute("correct-reading", "добавить+V+Perf+IV+PstAct+Adv")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "to add")
                        .addAttribute("original-text", "добавив")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,добавить+V+Perf+IV+Fut+Sg1:доба́влю,добавить+V+Perf+IV+Fut+Sg2:доба́вишь,добавить+V+Perf+IV+Fut+Sg3:доба́вит,добавить+V+Perf+IV+Fut+Pl1:доба́вим,добавить+V+Perf+IV+Fut+Pl2:доба́вите,добавить+V+Perf+IV+Fut+Pl3:доба́вят,добавить+V+Perf+IV+Pst+Msc+Sg:доба́вил,добавить+V+Perf+IV+Pst+Neu+Sg:доба́вило,добавить+V+Perf+IV+Pst+Fem+Sg:доба́вила,добавить+V+Perf+IV+Pst+MFN+Pl:доба́вили,добавить+V+Perf+IV+Imp+Sg2:доба́вь,добавить+V+Perf+IV+Imp+Pl2:доба́вьте,добавить+V+Perf+IV+Inf:доба́вить,добавить+V+Perf+IV+PrsAct+Adv,добавить+V+Perf+IV+PstAct+Adv:доба́вив,добавить+V+Perf+IV+PrsAct+Msc+AnIn+Sg+Nom,добавить+V+Perf+IV+PrsPss+Msc+AnIn+Sg+Nom,добавить+V+Perf+IV+PstAct+Msc+AnIn+Sg+Nom:доба́вивший,добавить+V+Perf+IV+PstPss+Msc+AnIn+Sg+Nom,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitCC() throws Exception {
        String text = "И";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 1)
                        .addAttribute("id", "VIEW-CC-1")
                        .addAttribute("lemma", "и")
                        .addAttribute("stressed-lemma", "и́")
                        .addAttribute("correct-form", "и́")
                        .addAttribute("correct-reading", "и+CC")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "Emphasizes the truth of the following verb. Note that \"есть\" is also used, which is usually omitted.")
                        .addAttribute("original-text", "И")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitCS() throws Exception {
        String text = "если";
        final Collection<ViewEnhancement> enhancements = runTest(text);

        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-CS-1")
                        .addAttribute("lemma", "если")
                        .addAttribute("stressed-lemma", "е́сли")
                        .addAttribute("correct-form", "е́сли" )
                        .addAttribute("correct-reading", "если+CS")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "if, in case")
                        .addAttribute("original-text", "если")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }



    @Test
    public void hitInterj() throws Exception {
        String text = "алло";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-Interj-1")
                        .addAttribute("lemma", "алло")
                        .addAttribute("stressed-lemma", "алло́")
                        .addAttribute("correct-form", "алло́")
                        .addAttribute("correct-reading", "алло+Interj")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "hello! (only on the telephone)")
                        .addAttribute("original-text", "алло")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitParen() throws Exception {
        String text = "наконец";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 7)
                        .addAttribute("id", "VIEW-Paren-1")
                        .addAttribute("lemma", "наконец")
                        .addAttribute("stressed-lemma", "наконе́ц")
                        .addAttribute("correct-form", "наконе́ц" )
                        .addAttribute("correct-reading", "наконец+Paren")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "at last, finally; at length; in conclusion")
                        .addAttribute("original-text", "наконец")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPcle() throws Exception {
        String text = "ли";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 2)
                        .addAttribute("id", "VIEW-Pcle-1")
                        .addAttribute("lemma", "ли")
                        .addAttribute("stressed-lemma", "ли")
                        .addAttribute("correct-form", "ли" )
                        .addAttribute("correct-reading", "ли+Pcle")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "whether, if")
                        .addAttribute("original-text", "ли")
                        .addAttribute("paradigms", "ñôŃßĘńŠēNEWPARADIGM,ли+N+Neu+Inan+Sg+Nom:ли́,ли+N+Neu+Inan+Sg+Acc:ли́,ли+N+Neu+Inan+Sg+Loc2,ли+N+Neu+Inan+Sg+Gen2,ли+N+Neu+Inan+Sg+Gen:ли́,ли+N+Neu+Inan+Sg+Loc:ли́,ли+N+Neu+Inan+Sg+Dat:ли́,ли+N+Neu+Inan+Sg+Ins:ли́,ли+N+Neu+Inan+Sg+Voc,ли+N+Neu+Inan+Pl+Nom:ли́,ли+N+Neu+Inan+Pl+Acc:ли́,ли+N+Neu+Inan+Pl+Loc2,ли+N+Neu+Inan+Pl+Gen2,ли+N+Neu+Inan+Pl+Gen:ли́,ли+N+Neu+Inan+Pl+Loc:ли́,ли+N+Neu+Inan+Pl+Dat:ли́,ли+N+Neu+Inan+Pl+Ins:ли́,ли+N+Neu+Inan+Pl+Voc,ñôŃßĘńŠēPARADIGMEND,")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPo() throws Exception {
        String text = "ради";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-Pr-1")
                        .addAttribute("lemma", "ради")
                        .addAttribute("stressed-lemma", "ра́ди")
                        .addAttribute("correct-form", "ра́ди" )
                        .addAttribute("correct-reading", "ради+Pr")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "for the sake of")
                        .addAttribute("original-text", "ради")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitPr() throws Exception {
        String text = "под";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 3)
                        .addAttribute("id", "VIEW-Pr-1")
                        .addAttribute("lemma", "под")
                        .addAttribute("stressed-lemma", "под")
                        .addAttribute("correct-form", "под" )
                        .addAttribute("correct-reading", "под+Pr")
                        .addAttribute("type", "hit")
                        .addAttribute("translation", "hearth, hearthstone; floor")
                        .addAttribute("original-text", "под")
                        .addAttribute("epenth", "подо")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }
}
