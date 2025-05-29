package werti.uima.enhancer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.types.annot.CGToken;
import werti.util.MutableInt;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

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
public class HFSTRusVerbAspectPairEnhancer extends AbstractHFSTRussianEnhancer {
	private static final Logger log = LogManager.getLogger();
	private static final String TOPIC = "verb-aspect-pairs";

	// FSTUPDATE: The patterns target FST features to find or exclude specific readings
	private final Pattern posPattern = Pattern.compile("V\\+");
	private final Pattern filterPattern = Pattern.compile("Impf|Perf");
	// Note that the whole token will be excluded, even when one reading is valid
	private final Pattern excludeTokenPattern = Pattern.compile("\\+N\\+|PstAct|PstPss|PrsAct|PrsPss");

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

		if(hitCGToken != null){
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
     * - aspectPairLemmas
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

		String aspectPairLemmas = createAspectPairLemmas(
				cgToken.getLemma(),
				cgToken.getFirstReading()
		);

		// only consider tokens with aspectual counter part
		if(!aspectPairLemmas.isEmpty()){
			enhancement.addAttribute("aspectPairLemmas", aspectPairLemmas);
		}

		enhancement.addToCas(cas);
	}

    /**
     * Create aspect pair lemmas using the respective maps.
     *
     * @param lemma the lemma of the hit
     * @param features the "+" delimited features of the hit
     * @return the "/" delimited aspect pair lemmas
     */
    private String createAspectPairLemmas(String lemma, String features) {
        String superscript = enhancerUtils.getSuperscript(lemma);

        // remove superscript characters from the lemma
        String preprocessedLemma = lemma.replace(superscript, "");

		String aspectPairLemmas = "";

		// imperfective case
		if(imperfectiveToPerfectiveVerbMap.containsKey(preprocessedLemma)){
			aspectPairLemmas = createPair(imperfectiveToPerfectiveVerbMap, preprocessedLemma);
		}
		else if(perfectiveToImperfectiveVerbMap.containsKey(preprocessedLemma)){
			aspectPairLemmas = createPair(perfectiveToImperfectiveVerbMap, preprocessedLemma);
		}

        return aspectPairLemmas;
    }

	/**
	 * Create a pair out of the preprocessed lemma and the aspectual counterpart.
	 *
	 * @param aspectMap either imperfective to perfective map or the other way around
	 * @param preprocessedLemma the lemma without superscript
	 * @return the aspect pair
	 */
	private String createPair(Map<String, String> aspectMap, String preprocessedLemma) {
    	return preprocessedLemma + "/" + aspectMap.get(preprocessedLemma);
	}
}
