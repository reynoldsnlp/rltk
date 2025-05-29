package werti.uima.enhancer;

import com.google.common.collect.ImmutableList;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.UimaTestService;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.ae.OpenNlpTokenizer;
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
public class HFSTRusPhoneticsTest {
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
                createEngineDescription(HFSTRusPhoneticsEnhancer.class)
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
                        .addAttribute("phonetic-transcription", "дʌс'т'и́гнутъму")
                        .addAttribute("distractors", "дъс'т'игнуто́му;дъс'т'игну́тъму;дъс'т'игнутʌму́;дʌс'т'и́гнутъму;до́с'т'игнутъму" )
                        .addAttribute("hint", "дости́гнутому")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "достигнутому")
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
                        .addAttribute("phonetic-transcription", "съглʌсо́вън")
                        .addAttribute("distractors", "съглъсʌва́н;съглʌсо́вън;сʌгла́съвън;со́глъсъвън" )
                        .addAttribute("hint", "согласо́ван")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "согласован")
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
                        .addAttribute("phonetic-transcription", "пръчита́йут")
                        .addAttribute("distractors", "про́читъйут;прʌчи́тъйут;пръчита́йут;прочитʌйу́т" )
                        .addAttribute("hint", "прочита́ют")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "прочитают")
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
                        .addAttribute("phonetic-transcription", "т'иб'э́")
                        .addAttribute("distractors", "т'иб'э́;т'э̂б'ь")
                        .addAttribute("hint", "тебе́")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "тебе")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitDet() throws Exception {
        String text = "всякий";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 6)
                        .addAttribute("id", "VIEW-Pron-Msc-AnIn-Sg-Nom-1")
                        .addAttribute("lemma", "всякий")
                        .addAttribute("phonetic-transcription", "фс'а̂к'ий")
                        .addAttribute("distractors", "фс'ик'и́й;фс'а̂к'ий" )
                        .addAttribute("hint", "вся́кий")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "всякий")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }

    @Test
    public void hitNum() throws Exception {
        String text = "двух";
        final List<Enhancement> expectedEnhancements = ImmutableList.of(
                new ViewEnhancement(0, 4)
                        .addAttribute("id", "VIEW-Num-Msc-Anim-Acc-1")
                        .addAttribute("lemma", "два")
                        .addAttribute("phonetic-transcription", "дву́х")
                        .addAttribute("hint", "дву́х" )
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "двух")
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
                        .addAttribute("phonetic-transcription", "фтʌро́въ")
                        .addAttribute("distractors", "фтʌро́гъ;фто́ръгъ;фтърʌго́")
                        .addAttribute("hint", "второ́го")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "второго")
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
                        .addAttribute("phonetic-transcription", "PS")
                        .addAttribute("hint", "PS" )
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
                        .addAttribute("phonetic-transcription", "дʌба́в'иф")
                        .addAttribute("distractors", "до́бъв'иф;дʌба́в'иф;дъбʌв'и́ф" )
                        .addAttribute("hint", "доба́вив")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "добавив")
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
                        .addAttribute("phonetic-transcription", "и́")
                        .addAttribute("hint", "и́")
                        .addAttribute("type", "hit")
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
                        .addAttribute("phonetic-transcription", "йэ̂с'л'и")
                        .addAttribute("distractors", "йис'л'и́;йэ̂с'л'и")
                        .addAttribute("hint", "е́сли" )
                        .addAttribute("type", "hit")
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
                        .addAttribute("phonetic-transcription", "ʌлло́")
                        .addAttribute("distractors", "ʌлло́;а́ллъ")
                        .addAttribute("hint", "алло́")
                        .addAttribute("type", "hit")
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
                        .addAttribute("phonetic-transcription", "нъкʌн'э́ц")
                        .addAttribute("distractors", "нʌко́н'ьц;на́кън'ьц;нъкʌн'э́ц")
                        .addAttribute("hint", "наконе́ц")
                        .addAttribute("type", "hit")
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
                        .addAttribute("phonetic-transcription", "л'и")
                        .addAttribute("hint", "ли" )
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "ли")
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
                        .addAttribute("phonetic-transcription", "ра́д'и")
                        .addAttribute("distractors", "ра́д'и;рʌд'и́")
                        .addAttribute("hint", "ра́ди")
                        .addAttribute("type", "hit")
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
                        .addAttribute("phonetic-transcription", "пот")
                        .addAttribute("hint", "под")
                        .addAttribute("type", "hit")
                        .addAttribute("original-text", "под")
        );

        assertEquals(
                "Should be a hit.",
                expectedEnhancements,
                runTest(text)
        );
    }
}
