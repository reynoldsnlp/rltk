package werti.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * This class handles the distractor generation for
 * each Russian Enhancer. Should the morphological
 * features change, this class needs to be reviewed.
 *
 * @author Eduard Schaf
 * @since 15.12.16
 */
public class RusDistractorGenerator {

    private static final Logger log = LogManager.getLogger();

    private static final String NEWLINE = System.lineSeparator();

    private final HFSTGenerator hfstGenerator;

    private final Map<String, String> imperfectiveToPerfectiveVerbMap;
    private final Map<String, String> perfectiveToImperfectiveVerbMap;

    private static final Pattern tensePattern = Pattern.compile("Pst|Prs|Fut");

    private static final Pattern casePattern = Pattern.compile("\\+(Nom|Acc|Gen|Loc|Dat|Ins|Loc2|Gen2|Voc)");

    private static final Pattern presentTensePattern = Pattern.compile("\\+(Sg|Pl)[123]");

    private static final Pattern pastTensePattern = Pattern.compile("\\+(Msc|Fem|Neu)\\+Sg|\\+MFN\\+Pl");

    private static final Pattern genderPattern = Pattern.compile("\\+(Msc|Fem|Neu|MFN)");

    private static final Pattern vowelPattern = Pattern.compile("[аеиоуыэюяёАЕИОУЫЭЮЯЁ]");

    private static final String[] caseForms = {"+Nom", "+Acc", "+Gen", "+Loc", "+Dat", "+Ins", "+Loc2", "+Gen2", "+Voc"};

    private static final String[] presentTenseForms = {"+Sg1", "+Sg2", "+Sg3", "+Pl1", "+Pl2", "+Pl3"};

    private static final String[] pastTenseForms = {"+Msc+Sg", "+Fem+Sg", "+Neu+Sg", "+MFN+Pl"};

    private static final String[] genderForms = {"+Msc", "+Fem", "+Neu", "+MFN"};

    private final RusEnhancerUtils enhancerUtils;

    public RusDistractorGenerator(
            final RusEnhancerUtils enhancerUtils,
            final HFSTGenerator hfstGenerator,
            Map<String, String> imperfectiveToPerfectiveVerbMap,
            Map<String, String> perfectiveToImperfectiveVerbMap
    ) {
        this.enhancerUtils = enhancerUtils;
        this.hfstGenerator = hfstGenerator;
        this.imperfectiveToPerfectiveVerbMap = imperfectiveToPerfectiveVerbMap;
        this.perfectiveToImperfectiveVerbMap = perfectiveToImperfectiveVerbMap;
    }

    /**
     * Given the hfst generator, a lemma with "+" delimited features  and
     * a topic create distractors for this topic.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @param topic the topic the distractors are made for
     * @return a space separated string of at least two distractors
     */
    public String createDistractors(
            String lemma,
            String features,
            String topic) {

        String distractors = "";
        switch (topic) {
            case "nouns":
                distractors = createNounDistractors(lemma, features);
                break;
            case "adjectives":
                distractors = createAdjectiveDistractors(lemma, features);
                break;
            case "verb-aspect-pairs":
                distractors = createVerbAspectPairDistractors(lemma, features);
                break;
            case "verbs":
            case "verb-tense":
                distractors = createVerbDistractors(lemma, features);
                break;
            case "participles":
                distractors = createParticipleDistractors(lemma, features);
                break;
            default:
                log.info("There is no distractor generation for the topic " + topic);
        }
        return distractors;
    }

    /**
     * Given the lemma and "+" delimited features
     * create noun distractors.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @return a space separated string of distractors
     */
    private String createNounDistractors(String lemma, String features) {
        Matcher caseMatcher = casePattern.matcher(features);

        Set<String> distractorSet = new HashSet<>();

        if(caseMatcher.find()){
            String sourceCase = caseMatcher.group();

            for(String otherCase: caseForms) {

                addToDistractorSet(
                        lemma,
                        features.replace(sourceCase, otherCase),
                        distractorSet
                );
            }
        }
        return joinDistractors(distractorSet);
    }

    /**
     * Given the lemma and "+" delimited features
     * create adjective distractors.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @return a space separated string of distractors
     */
    private String createAdjectiveDistractors(String lemma, String features) {

        StringBuilder generatorInputBuilder = new StringBuilder();

        // build the generator input for one gender
        Matcher caseMatcher = casePattern.matcher(features);

        if(caseMatcher.find()){
            String sourceCase = caseMatcher.group();

            String animate = "+Anim";
            String inanimate = "+Inan";
            String animateAndInanimate = "+AnIn";

            String featuresAnimateAndInanimate = features
                    .replace(animate, animateAndInanimate)
                    .replace(inanimate, animateAndInanimate);

            for(String otherCase: caseForms) {

                if("+Acc".equals(otherCase)){

                    String featuresAnimate = featuresAnimateAndInanimate
                            .replace(sourceCase, otherCase)
                            .replace(animateAndInanimate, animate);

                    String featuresInanimate = featuresAnimateAndInanimate
                            .replace(sourceCase, otherCase)
                            .replace(animateAndInanimate, inanimate);

                    generatorInputBuilder
                            .append(lemma)
                            .append(featuresAnimate)
                            .append(NEWLINE)
                            .append(lemma)
                            .append(featuresInanimate)
                            .append(NEWLINE);
                }

                generatorInputBuilder
                        .append(lemma)
                        .append(featuresAnimateAndInanimate.replace(sourceCase, otherCase))
                        .append(NEWLINE);
            }
        }

        // build the generator input of the other genders
        Matcher genderMatcher = genderPattern.matcher(features);

        if(genderMatcher.find()){
            String sourceGender = genderMatcher.group();

            // only consider the genders other than the source gender, as we already have it
            List<String> otherGenderForms = Stream.of(genderForms)
                    .filter(gender -> !gender.equals(sourceGender))
                    .collect(Collectors.toList());

            for(String otherGender: otherGenderForms) {

                String generatorInputOfOneGender = generatorInputBuilder
                        .toString()
                        .replace(sourceGender, otherGender);

                if("+MFN".equals(otherGender)){
                    generatorInputBuilder.append(generatorInputOfOneGender.replace("+Sg+", "+Pl+"));
                }
                else{
                    generatorInputBuilder.append(generatorInputOfOneGender.replace("+Pl+", "+Sg+"));
                }

                generatorInputBuilder.append(NEWLINE);
            }
        }

        Set<String> distractorSet = new HashSet<>();

        String[] lemmaWithFeaturesArray = generatorInputBuilder.toString().trim().split(NEWLINE);

        // generate all word forms from the generatorInput
        Stream.of(lemmaWithFeaturesArray)
                .map(hfstGenerator::runTransducer)
                .forEach(distractorSet::addAll);

        return joinDistractors(distractorSet);
    }

    /**
     * Given the lemma and "+" delimited features
     * create any verb distractors.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @return a space separated string of distractors
     */
    private String createVerbDistractors(String lemma, String features) {
        Matcher tenseMatcher = tensePattern.matcher(features);
        if(tenseMatcher.find()){
            String tense = tenseMatcher.group();
            if("Prs".equals(tense) ||
                    "Fut".equals(tense)){
                return createVerbPresentTenseDistractors(lemma, features);
            }
            else{
                return createVerbPastTenseDistractors(lemma, features);
            }
        }
        return "";
    }

    /**
     * Given the lemma and "+" delimited features
     * create present tense verb distractors.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @return a space separated string of distractors
     */
    private String createVerbPresentTenseDistractors(String lemma, String features) {
        Matcher presentTenseMatcher = presentTensePattern.matcher(features);

        Set<String> distractorSet = new HashSet<>();

        if(presentTenseMatcher.find()){
            String sourcePresentTense = presentTenseMatcher.group();

            for(String otherPresentTense: presentTenseForms) {

                addToDistractorSet(
                        lemma,
                        features.replace(sourcePresentTense, otherPresentTense),
                        distractorSet
                );
            }
        }
        return joinDistractors(distractorSet);
    }

    /**
     * Given the lemma and "+" delimited features
     * create past tense verb distractors.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @return a space separated string of distractors
     */
    private String createVerbPastTenseDistractors(String lemma, String features) {
        Matcher pastTenseMatcher = pastTensePattern.matcher(features);

        Set<String> distractorSet = new HashSet<>();

        if(pastTenseMatcher.find()){
            String sourcePastTense = pastTenseMatcher.group();

            // add the current reading
            addToDistractorSet(
                    lemma,
                    features,
                    distractorSet
            );

            // generate all possible forms
            for(String otherPastTense: pastTenseForms) {

                addToDistractorSet(
                        lemma,
                        features.replace(sourcePastTense, otherPastTense),
                        distractorSet
                );
            }

        }
        return joinDistractors(distractorSet);
    }

    /**
     * Given the lemma and "+" delimited features
     * create verb aspect pair distractors.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @return a space separated string of distractors
     */
    private String createVerbAspectPairDistractors(String lemma, String features) {

        Set<String> distractorSet = new HashSet<>();

        String superscript = enhancerUtils.getSuperscript(lemma);

        // remove superscript characters from the lemma
        String preprocessedLemma = lemma.replace(superscript, "");

        String perfective = "Perf";

        String imperfective = "Impf";

        String present = "Prs";

        String future = "Fut";

        // imperfective case
        if(features.contains(imperfective) && imperfectiveToPerfectiveVerbMap.containsKey(preprocessedLemma)){

            // retrieve the perfective verb lemma
            String perfectiveVerbLemma = imperfectiveToPerfectiveVerbMap.get(preprocessedLemma);

            // change the features to perfective, future tense
            String perfectiveFeatures = features
                    .replace(imperfective, perfective)
                    .replace(present, future);

            // add the aspectual counterpart
            addToDistractorSet(
                    perfectiveVerbLemma,
                    perfectiveFeatures,
                    distractorSet
            );
        }
        // perfective case
        else if(perfectiveToImperfectiveVerbMap.containsKey(preprocessedLemma)){

            // retrieve the imperfective verb lemma
            String imperfectiveVerbLemma = perfectiveToImperfectiveVerbMap.get(preprocessedLemma);

            // change the features to imperfective, present tense
            String imperfectiveFeatures = features
                    .replace(perfective, imperfective)
                    .replace(future, present);

            // add the aspectual counterpart
            addToDistractorSet(
                    imperfectiveVerbLemma,
                    imperfectiveFeatures,
                    distractorSet
            );
        }

        // add the current reading
        addToDistractorSet(
                lemma,
                features,
                distractorSet
        );

        return joinDistractors(distractorSet);
    }

    /**
     * Given the lemma and "+" delimited features
     * create participle distractors.
     *
     * @param lemma the lemma
     * @param features the "+" delimited features
     * @return a space separated string of distractors
     */
    private String createParticipleDistractors(String lemma, String features) {
        Set<String> distractorSet = new HashSet<>();

        String superscript = enhancerUtils.getSuperscript(lemma);

        // remove superscript characters from the lemma
        String preprocessedLemma = lemma.replace(superscript, "");

        String perfective = "Perf";

        String imperfective = "Impf";

        String presentActive = "PrsAct";

        String presentPassive = "PrsPss";

        String pastActive = "PstAct";

        String pastPassive = "PstPss";

        // imperfective case
        if(features.contains(imperfective) && imperfectiveToPerfectiveVerbMap.containsKey(preprocessedLemma)){

            // retrieve the perfective verb lemma
            String perfectiveVerbLemma = imperfectiveToPerfectiveVerbMap.get(preprocessedLemma);

            String perfectiveFeatures = features
                    .replace(imperfective, perfective);

            if(features.contains(presentActive)){

                // add present passive
                addToDistractorSet(
                        lemma,
                        features.replace(presentActive, presentPassive),
                        distractorSet
                );

                addAspectualCounterPart(
                        perfectiveVerbLemma,
                        perfectiveFeatures.replace(presentActive, pastActive),
                        perfectiveFeatures.replace(presentActive, pastPassive),
                        distractorSet
                );
            }
            else if(features.contains(presentPassive)){

                // add present active
                addToDistractorSet(
                        lemma,
                        features.replace(presentPassive, presentActive),
                        distractorSet
                );

                addAspectualCounterPart(
                        perfectiveVerbLemma,
                        perfectiveFeatures.replace(presentPassive, pastActive),
                        perfectiveFeatures.replace(presentPassive, pastPassive),
                        distractorSet
                );
            }
        }
        // perfective case
        else if(perfectiveToImperfectiveVerbMap.containsKey(preprocessedLemma)){

            // retrieve the imperfective verb lemma
            String imperfectiveVerbLemma = perfectiveToImperfectiveVerbMap.get(preprocessedLemma);

            String imperfectiveFeatures = features
                    .replace(perfective, imperfective);

            if(features.contains(pastActive)){

                // add past passive
                addToDistractorSet(
                        lemma,
                        features.replace(pastActive, pastPassive),
                        distractorSet
                );

                addAspectualCounterPart(
                        imperfectiveVerbLemma,
                        imperfectiveFeatures.replace(pastActive, presentActive),
                        imperfectiveFeatures.replace(pastActive, presentPassive),
                        distractorSet
                );
            }
            else if(features.contains(pastPassive)){

                // add past active
                addToDistractorSet(
                        lemma,
                        features.replace(pastPassive, pastActive),
                        distractorSet
                );

                addAspectualCounterPart(
                        imperfectiveVerbLemma,
                        imperfectiveFeatures.replace(pastPassive, presentActive),
                        imperfectiveFeatures.replace(pastPassive, presentPassive),
                        distractorSet
                );
            }
        }
        // add current reading
        addToDistractorSet(
                lemma,
                features,
                distractorSet
        );

        return joinDistractors(distractorSet);
    }

    /**
     * Given the lemma, "+" delimited features,
     * active and passive features create distractors for
     * the aspectual counterpart.
     *
     * @param counterPartLemma the lemma
     * @param counterPartActiveFeatures the "+" delimited features
     *                                  with active voice
     * @param counterPartPassiveFeatures the "+" delimited features
     *                                   with passive voice
     * @param distractorSet the set the distractors are being add to
     */
    private void addAspectualCounterPart(
            String counterPartLemma,
            String counterPartActiveFeatures,
            String counterPartPassiveFeatures,
            Set<String> distractorSet) {
        // add aspectual counterpart with active voice
        addToDistractorSet(
                counterPartLemma,
                counterPartActiveFeatures,
                distractorSet
        );

        // add aspectual counterpart with passive voice
        addToDistractorSet(
                counterPartLemma,
                counterPartPassiveFeatures,
                distractorSet
        );
    }

    /**
     * Given a surface form, generate one distractor with stress marker
     * per vowel. Can only handle primary stress.
     * Example for double stress marker: "а̀втоколо́нна"
     *
     * @param surfaceForm the surface form of a word
     * @return a space separated string of distractors
     */
    public String createWordStressDistractors(String surfaceForm) {
        // create distractors with stressed vowels like these:
        // а́ е́ ё́ и́ о́ у́ ы́ э́ ю́ я́
        // А́ Е́ Ё́ И́ О́ У́ Ы́ Э́ Ю́ Я́
        String primaryStressMarker = "\u0301";

        // find the vowels
        Matcher vowelMatcher = vowelPattern.matcher(surfaceForm);

        String adjustedSurfaceForm = surfaceForm;
        String smallJo = "ё";
        String bigJo = "Ё";

        // turn ё or Ё into е or Е allowing the stress to be placed on another vowel
        if(surfaceForm.contains(smallJo)||surfaceForm.contains(bigJo)){
            adjustedSurfaceForm = surfaceForm.replace(smallJo, "е").replace(bigJo, "Е");
        }

        // TODO: Should forms without a Jo have a distractor with a Jo?

        Set<String> distractorSet = new HashSet<>();

        while(vowelMatcher.find()){
            String foundVowel = vowelMatcher.group();
            // this special case can be a distractor right away
            if(foundVowel.equals(smallJo) ||
                    foundVowel.equals(bigJo)){
                distractorSet.add(surfaceForm);
            }
            // all other vowels need a stress marker on the found vowel
            else{
                String vowelWithStress = foundVowel+primaryStressMarker;
                String distractorWithStress =
                        adjustedSurfaceForm.substring(0, vowelMatcher.start()) +
                                vowelWithStress +
                                adjustedSurfaceForm.substring(vowelMatcher.end());
                distractorSet.add(distractorWithStress);
            }
        }
        return joinDistractors(distractorSet);
    }

    /**
     * Given the lemma, "+" delimited features and the distractor set,
     * generate and add the produced distractors to the set.
     *
     * @param lemma the lemma part of the the input required to create
     *              distractors
     * @param features the "+" delimited features as the second part
     *                 required to create distractors
     * @param distractorSet the set the distractors are being add to
     */
    private void addToDistractorSet(
            String lemma,
            String features,
            Set<String> distractorSet) {

        Stream.of(lemma + features)
                .map(hfstGenerator::runTransducer)
                .forEach(distractorSet::addAll);
    }

    /**
     * Given a distractor set, all distractors are being joined.
     *
     * @param distractorSet the distractor set to join
     * @return a ";" delimited string of distractors
     */
    private static String joinDistractors(Set<String> distractorSet){
        return distractorSet
                .stream()
                .collect(Collectors.joining(";"));
    }
}
