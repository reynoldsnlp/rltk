package werti.uima.enhancer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.types.annot.CGToken;
import werti.util.MutableInt;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * The output from the CG3 analysis from {@link HFSTAnnotator}
 * is being used to enhance spans corresponding to the tags specified by the topic
 * and the activity that was chosen by the user.
 * The patterns are used to extract the enhancements.
 *
 * @author Niels Ott
 * @author Adriane Boyd
 * @author Heli Uibo
 * @author Eduard Schaf
 *
 */
public class HFSTRusParticipleEnhancer extends AbstractHFSTRussianEnhancer {
    private static final Logger log = LogManager.getLogger();

	private static final String TOPIC = "participles";

	// FSTUPDATE: The patterns target FST features to find or exclude specific readings
	private final Pattern posPattern = Pattern.compile("V\\+");
	private final Pattern filterPattern = Pattern.compile("PrsAct|PrsPss|PstAct|PstPss");
	// Note that the whole token will be excluded, even when one reading is valid
    // Note that we removed the pattern A\+ because of these tags +Der/PstPss+A+,
    // and some participles are used as adjectives. We decided to use them.
	private final Pattern excludeTokenPattern = Pattern.compile("\\+N\\+|Det|Pred|Adv");

	private Map<String, MutableInt> idCounts = new HashMap<>();

	/**
	 * Processing of a cg token. Selects a reading from
	 * a clue or a hit and enhances it.
	 *
	 * @param cgToken the cg token to process
	 * @param cas the current cas
	 */
	protected void processCGToken(CGToken cgToken, ConvenientCas cas) {
        CGToken hitCGToken = enhancerUtils.checkForHit(
                cgToken,
                excludeTokenPattern,
                posPattern,
                filterPattern
        );

		if(hitCGToken != null && !isAmbiguous(cgToken) && !adjectivesToExcludeFromParticiples.contains(hitCGToken.getLemma())){
		    processHit(cgToken, cas);
		}
	}

	/**
	 * A hit was selected and is being processed here. Create a
	 * view enhancement tag containing:
	 * - id
	 * - lemma
	 * - correctForm
	 * - distractors
	 * - rephrase
	 *
	 * @param cgToken the cg token the reading was selected from
	 * @param cas the current cas
	 */
	private void processHit(CGToken cgToken, ConvenientCas cas) {
        final ViewEnhancement enhancement = enhancementCreator.createCommonEnhancement(
                cgToken,
                idCounts,
                TOPIC,
                filterPattern
        );

        String rephrase = createRephrase(cgToken.getLemma(), cgToken.getFirstReading());

        //TODO: This isn't ideal: Pattern.compile("Ambiguous"), checking the ambiguity of the relative pronoun.
        // We can fix it by editing the disambiguator
        if(!rephrase.isEmpty() && !Pattern.compile("Ambiguous").matcher(rephrase).find()){
            enhancement.addAttribute("rephrase", rephrase);
        }

		enhancement.addToCas(cas);
	}

    /**
     * Check for ambiguity in the readings
     * Ambiguity in number and in case
     *
     * @param cgToken the cg token the reading was selected from
     */
	private boolean isAmbiguous(CGToken cgToken) {
        String allReadings = cgToken.getAllReadings();

        if(Pattern.compile("\\+Sg").matcher(allReadings).find() && Pattern.compile("\\+Pl").matcher(allReadings).find()) {
            return true;
        }
        else if(Pattern.compile("\\+Sg").matcher(allReadings).find()){
            if(Pattern.compile("\\+Gen").matcher(allReadings).find() && Pattern.compile("\\+Acc").matcher(allReadings).find()){
                return true;
            }
            return false;
        }
        else if(Pattern.compile("\\+Pl").matcher(allReadings).find()) {
            if(Pattern.compile("\\+AnIn").matcher(allReadings).find() && Pattern.compile("\\+Acc").matcher(allReadings).find()) {
                return true;
            }
            else if((Pattern.compile("\\+Gen").matcher(allReadings).find() ||
                    (Pattern.compile("\\+Acc").matcher(allReadings).find() && Pattern.compile("\\+Anim").matcher(allReadings).find()))
                            && Pattern.compile("\\+Loc").matcher(allReadings).find()) {
                return true;
            }
            return false;
        }
        else {
            return true;
        }
    }

    private String createRephrase(String lemma, String features) {
        // FSTUPDATE: the rephrasing is constructed using FST features

        Pattern aspectPattern = Pattern.compile("Impf|Perf");
        Pattern transitivityPattern = Pattern.compile("IV|TV");
        Pattern genderPattern = Pattern.compile("Msc|Fem|Neu|MFN");
        Pattern animacyPattern = Pattern.compile("AnIn|Inan|Anim");
        Pattern numberPattern = Pattern.compile("Sg|Pl");
        Pattern tenseActiveVoicePattern = Pattern.compile("(Prs|Pst)Act");
        Pattern tensePassiveVoicePattern = Pattern.compile("(Prs|Pst)Pss");

        Matcher aspectMatcher = aspectPattern.matcher(features);
        Matcher transitivityMatcher = transitivityPattern.matcher(features);
        Matcher genderMatcher = genderPattern.matcher(features);
        Matcher animacyMatcher = animacyPattern.matcher(features);
        Matcher numberMatcher = numberPattern.matcher(features);
        Matcher tenseActiveVoiceMatcher = tenseActiveVoicePattern.matcher(features);
        Matcher tensePassiveVoiceMatcher = tensePassiveVoicePattern.matcher(features);

        String aspect = "";
        String transitivity = "";
        String tense = "";
        String gender = "";
        String animacy = "";
        String number = "";

        if(aspectMatcher.find()){
            aspect = aspectMatcher.group();
        }
        if(transitivityMatcher.find()){
            transitivity = transitivityMatcher.group();
        }
        if(genderMatcher.find()){
            gender = genderMatcher.group();
        }
        if(animacyMatcher.find()){
            animacy = animacyMatcher.group();
        }
        if(numberMatcher.find()){
            number = numberMatcher.group();
        }

        String relPron = "который+Pron+Rel+" + gender + "+" + animacy + "+" + number;
        String verb = lemma+"+V";

        Set<String> relativePronounSet = new HashSet<>();

        String presentTense = "Prs";

        // active voice
        if(tenseActiveVoiceMatcher.find()){
            relPron += "+Nom";
            relativePronounSet.add(relPron);
            tense = tenseActiveVoiceMatcher.group(1);

            // present active participle
            if(tense.equals(presentTense)){
                verb += "+" + aspect + "+" + transitivity + "+" + tense + "+" + number + "3";
            }
            // past active participle
            else {
                verb += "+" + aspect + "+" + transitivity + "+" + tense + "+" + gender + "+" + number;
            }
        }
        // passive voice
        else if(tensePassiveVoiceMatcher.find()){
            relPron += "+Acc";
            relativePronounSet.add(relPron);
            tense = tensePassiveVoiceMatcher.group(1);

            // present passive participle
            if(tense.equals(presentTense)){
                verb += "+" + aspect + "+" + transitivity + "+" + tense + "+Pl3";
            }
            // past passive participle
            else {
                verb += "+" + aspect + "+" + transitivity + "+" + tense + "+MFN+Pl";
            }
        }

        return relativePronounSet
                    .stream()
                    .map(element -> {
                        if(hfstGenerator.runTransducer(element).iterator().hasNext()) {
                            return hfstGenerator.runTransducer(element).iterator().next();
                        }
                        else {
                            log.info("Relative Pronoun " + element + " is not generated by the HFSTGenerator");
                            return "Ambiguous";
                        }
                    })
                    .collect(Collectors.joining("/"))
                    .concat(" ")
                    .concat(hfstGenerator.runTransducer(verb).iterator().next());
    }
}
