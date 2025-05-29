package werti.util;

import org.junit.Before;
import org.junit.Test;
import werti.server.ViewTestContext;

import static org.junit.Assert.assertEquals;

/**
 * @author Eduard Schaf
 * @since 15.12.16
 */
public class RusDistractorGeneratorTest {
    private RusDistractorGenerator distractorGenerator;

    @Before
    public void initHfstGenerator() throws Exception {
        distractorGenerator = new RussianTestUtilities(
                ViewTestContext.createTestContext()
        ).getDistractorGenerator();
    }

    private void distractorTest(
            String documentation,
            String expectedAnalyses,
            String lemma,
            String features,
            String topic
    ) {
        String resultAnalyses = distractorGenerator.createDistractors(
                lemma,
                features,
                topic
        );
        assertEquals(
                documentation,
                expectedAnalyses,
                resultAnalyses

        );
    }

    @Test
    public void unknownTopic() {
        distractorTest(
                "The result should be an empty string, as the topic is unknown.",
                "",
                "кондуктор",
                "+N+Msc+Anim+Pl+Nom",
                "Unknown"
        );
    }

    @Test
    public void inputTopicMismatch() {
        distractorTest(
                "The result should be an empty string, as the input does not match the topic.",
                "",
                "видеть",
                "+V+Impf+IV+Pst+Fem+Sg",
                "nouns"
        );
    }

    @Test
    public void distractorsForNounsSingular() {
        distractorTest(
                "All distractors should be distinct and match.",
                "ночь;ночи;ночью",
                "ночь",
                "+N+Fem+Inan+Sg+Acc",
                "nouns");
    }

    @Test
    public void distractorsForNounsPlural() {
        distractorTest(
                "All distractors should be distinct and match.",
                "кондукторы;кондукторами;кондукторам;кондуктора;кондукторов;кондукторах",
                "кондуктор",
                "+N+Msc+Anim+Pl+Nom",
                "nouns");
    }

    @Test
    public void distractorsForAdjectivesFeminine() {
        // missing: российский+A+Fem+AnIn+Sg+Ins+Leng	росси́йскою
        distractorTest(
                "All distractors should be distinct and match.",
                "российского;российские;российских;" +
                        "российском;российская;российскую;" +
                        "российской;российским;российское;" +
                        "российскими;российский;российскому",
                "российский",
                "+A+Fem+AnIn+Sg+Nom",
                "adjectives"
        );
    }

    @Test
    public void distractorsForAdjectivesMasculine() {
        // missing: российский+A+Fem+AnIn+Sg+Ins+Leng	росси́йскою
        distractorTest(
                "All distractors should be distinct and match.",
                "гуманитарному;гуманитарное;гуманитарного;" +
                        "гуманитарную;гуманитарной;гуманитарными;" +
                        "гуманитарные;гуманитарных;гуманитарным;" +
                        "гуманитарная;гуманитарный;гуманитарном",
                "гуманитарный",
                "+A+Msc+AnIn+Sg+Nom",
                "adjectives"
        );
    }

    @Test
    public void distractorsForAdjectivesNeutral() {
        // missing: российский+A+Fem+AnIn+Sg+Ins+Leng	росси́йскою
        distractorTest(
                "All distractors should be distinct and match.",
                "популярное;популярного;популярными;" +
                        "популярные;популярных;популярному;" +
                        "популярную;популярной;популярном;" +
                        "популярный;популярная;популярным",
                "популярный",
                "+A+Neu+AnIn+Sg+Nom",
                "adjectives"
        );
    }

    @Test
    public void distractorsForAdjectivesMFN() {
        // missing: российский+A+Fem+AnIn+Sg+Ins+Leng	росси́йскою
        distractorTest(
                "All distractors should be distinct and match.",
                "вредному;вредная;вредными;" +
                        "вредный;вредном;вредную;" +
                        "вредной;вредные;вредных;" +
                        "вредное;вредного;вредным",
                "вредный",
                "+A+MFN+AnIn+Pl+Acc",
                "adjectives"
        );
    }

    @Test
    public void distractorsForPastTenseVerbsSingularSource() {
        distractorTest(
                "All distractors should be distinct and match.",
                "видели;видело;видела;видел",
                "видеть",
                "+V+Impf+IV+Pst+Fem+Sg",
                "verb-tense");
    }

    @Test
    public void distractorsForPastTenseVerbsPluralSource() {
        distractorTest(
                "All distractors should be distinct and match.",
                "видели;видело;видел;видела",
                "видеть",
                "+V+Impf+IV+Pst+MFN+Pl",
                "verb-tense");
    }

    @Test
    public void distractorsForPresentTenseVerbs() {
        distractorTest(
                "All distractors should be distinct and match.",
                "видит;видят;вижу;видим;видите;видишь",
                "видеть",
                "+V+Impf+IV+Prs+Sg1",
                "verb-tense");
    }

    @Test
    public void distractorsForFutureTenseVerbs() {
        distractorTest(
                "All distractors should be distinct and match.",
                "увижу;увидит;увидишь;увидим;увидите;увидят",
                "увидеть",
                "+V+Perf+IV+Fut+Sg1",
                "verb-tense");
    }

    @Test
    public void distractorsForPerfectiveVerbs() {
        distractorTest(
                "All distractors should be distinct and match.",
                "увижу;увидит;увидишь;увидим;увидите;увидят",
                "увидеть",
                "+V+Perf+IV+Fut+Sg1",
                "verbs");
    }

    @Test
    public void distractorsForImperfectiveVerbs() {
        distractorTest(
                "All distractors should be distinct and match.",
                "видит;видят;вижу;видим;видите;видишь",
                "видеть",
                "+V+Impf+IV+Prs+Sg1",
                "verbs");
    }

    @Test
    public void distractorsForImperfectiveAspectPairVerbs() {
        distractorTest(
                "All distractors should be distinct and match.",
                "увижу;вижу",
                "видеть",
                "+V+Impf+IV+Prs+Sg1",
                "verb-aspect-pairs");
    }

    @Test
    public void distractorsForPerfectiveAspectPairVerbs() {
        distractorTest(
                "All distractors should be distinct and match.",
                "увижу;вижу",
                "увидеть",
                "+V+Perf+IV+Fut+Sg1",
                "verb-aspect-pairs");
    }

    @Test
    public void distractorsForAspectVerbPairsMissingKey() {
        distractorTest(
                "The distractor of the input should be generated but nothing else",
                "бил",
                "бить",
                "+V+Impf+IV+Pst+Msc+Sg",
                "verb-aspect-pairs"
        );
    }

    @Test
    public void distractorsForImperfectivePresentActiveParticiples() {
        distractorTest(
                "All distractors should be distinct and match.",
                "глотающий;проглотивший;глотаемый;проглоченный",
                "глотать",
                "+V+Impf+TV+PrsAct+Msc+AnIn+Sg+Nom",
                "participles");
    }

    @Test
    public void distractorsForImperfectivePresentPassiveParticiples() {
        distractorTest(
                "All distractors should be distinct and match.",
                "глотающий;проглотивший;глотаемый;проглоченный",
                "глотать",
                "+V+Impf+TV+PrsPss+Msc+AnIn+Sg+Nom",
                "participles");
    }

    @Test
    public void distractorsForPerfectivePastActiveParticiples() {
        distractorTest(
                "All distractors should be distinct and match.",
                "глотающий;проглотивший;глотаемый;проглоченный",
                "проглотить",
                "+V+Perf+TV+PstAct+Msc+AnIn+Sg+Nom",
                "participles");
    }

    @Test
    public void distractorsForPerfectivePastPassiveParticiples() {
        distractorTest(
                "All distractors should be distinct and match.",
                "глотающий;проглотивший;глотаемый;проглоченный",
                "проглотить",
                "+V+Perf+TV+PstPss+Msc+AnIn+Sg+Nom",
                "participles");
    }

    @Test
    public void distractorsForParticiplesIgnoreImpfPstAct() {
        distractorTest(
                "There should be only one distractor.",
                "глотавший",
                "глотать",
                "+V+Impf+TV+PstAct+Msc+AnIn+Sg+Nom",
                "participles");
    }

    @Test
    public void distractorsForParticiplesIgnoreImpfPstPssNoWordForm() {
        distractorTest(
                "There should be no distractors.",
                "",
                "глотать",
                "+V+Impf+TV+PstPss+Msc+AnIn+Sg+Nom",
                "participles");
    }

    @Test
    public void distractorsForParticiplesIgnorePerfPrsActNoWordForm() {
        distractorTest(
                "There should be no distractors.",
                "",
                "participles",
                "проглотить",
                "+V+Perf+TV+PrsAct+Msc+AnIn+Sg+Nom"
        );
    }

    @Test
    public void distractorsForParticiplesIgnorePerfPrsPssNoWordForm() {
        distractorTest(
                "There should be no distractors",
                "",
                "participles",
                "проглотить",
                "+V+Perf+TV+PrsPss+Msc+AnIn+Sg+Nom"
                );
    }

    private void wordStressDistractorTest(
            String documentation,
            String expectedAnalyses,
            String surfaceForm
    ) {
        String resultAnalyses = distractorGenerator.createWordStressDistractors(surfaceForm);
        assertEquals(
                documentation,
                expectedAnalyses,
                resultAnalyses
        );
    }

    @Test
    public void wordStressDistractorsRegular() {
        wordStressDistractorTest(
                "There should be one distractor with stress marker per vowel.",
                "язы́ка;языка́;я́зыка",
                "языка"
        );
    }

    @Test
    public void wordStressDistractorsIrregular() {
        wordStressDistractorTest(
                "There should be one distractor with stress marker per vowel. " +
                        "The irregular \"ё\" can already be considered stress marked. " +
                        "\"ё\" should turn to \"е\" when the stress is on another vowel.",
                "четырёх;че́тырех;четы́рех",
                "четырёх"
        );
    }

    @Test
    public void wordStressDistractorsOnlyOne() {
        wordStressDistractorTest(
                "There should be only one distractor with stress " +
                        "marker, as there is only one vowel.",
                "что́",
                "что"
        );
    }

    @Test
    public void wordStressDistractorsNone() {
        wordStressDistractorTest(
                "There should be no distractors with stress marker, " +
                        "as there is no vowel.",
                "",
                "в"
        );
    }
}
