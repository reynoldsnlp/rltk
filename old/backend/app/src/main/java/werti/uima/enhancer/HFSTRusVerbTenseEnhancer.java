package werti.uima.enhancer;

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
public class HFSTRusVerbTenseEnhancer extends AbstractHFSTRussianEnhancer {
	private static final String TOPIC = "verb-tense";

	// FSTUPDATE: The patterns target FST features to find or exclude specific readings
	private final Pattern posPattern = Pattern.compile("V\\+");
	private final Pattern filterPattern = Pattern.compile("Pst|Prs|Fut");
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

		enhancement.addToCas(cas);
	}
}
