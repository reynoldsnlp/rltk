package werti.uima.enhancer;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.uima.UimaContext;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.resources.NoResourceException;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.types.annot.CGToken;
import werti.util.HFSTG2P;
import werti.util.HFSTPhoneticGenerator;
import werti.util.HFSTStressGenerator;
import werti.util.MutableInt;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The output from the CG3 analysis from {@link HFSTAnnotator}
 * is being used to enhance spans corresponding to the tags specified by the topic
 * and the activity that was chosen by the user.
 * The patterns are used to extract the enhancements.
 *
 * @author Konnor Petersen
 *
 */
public class HFSTRusPhoneticsEnhancer extends AbstractHFSTRussianEnhancer {
	private static final Logger log = LogManager.getLogger();
	private static final String TOPIC = "phonetics";

	// FSTUPDATE: The patterns target FST features to find or exclude specific readings
	private final Pattern posPattern = Pattern.compile("\\+(N|A|V|Pron|Det|Num|Num\\+Ord|Abbr|Adv.*|CC|CS|Interj|Paren|Pcle|Po|Pr)\\b");

	private Map<String, MutableInt> idCounts = new HashMap<>();

	private HFSTG2P hfstG2P;
	private HFSTPhoneticGenerator hfstPhoneticGenerator;
	private HFSTStressGenerator hfstStressGenerator;

	@Override
	public void initialize(UimaContext context) throws ResourceInitializationException {
		super.initialize(context);

		try {
			hfstG2P = new HFSTG2P(resourceFactory, Language.RUSSIAN);
			hfstPhoneticGenerator = new HFSTPhoneticGenerator(resourceFactory, Language.RUSSIAN);
			hfstStressGenerator = new HFSTStressGenerator(resourceFactory, Language.RUSSIAN);
		} catch (NoResourceException e) {
			throw new ResourceInitializationException(e);
		}
	}

	/**
	 * Processing of a cg token. Selects a reading from
	 * a clue or a hit and enhances it.
	 *
	 * @param cgToken the cg token to process
	 * @param cas the current cas
	 */
	protected void processCGToken(CGToken cgToken, ConvenientCas cas) {

		CGToken hitCGToken = null;

		String firstReading = cgToken.getFirstReading();

		if(posPattern.matcher(firstReading).find()) {
			hitCGToken = cgToken;
		}

		if(hitCGToken != null){
			processHit(cgToken, cas);
		}
	}

	/**
	 * A hit was selected and is being processed here. Create a
	 * view enhancement tag containing:
	 * - id
	 * - lemma
	 *
	 * @param cgToken the cg token the reading was selected from
	 * @param cas the current cas
	 */
	private void processHit(CGToken cgToken, ConvenientCas cas) {
		String lemma = cgToken.getLemma();

		String hitFeatures = cgToken.getFirstReading();

		final ViewEnhancement enhancement = new ViewEnhancement(cgToken);

		if(hitFeatures.isEmpty()){
			enhancement.addAttribute("id", enhancerUtils.getId("+" + cgToken.getCoveredText(), idCounts));
		}
		else{
			enhancement.addAttribute("id", enhancerUtils.getId(hitFeatures, idCounts));
		}

		enhancement.addAttribute("lemma", lemma);

		Set<String> searchWordSet = hfstStressGenerator.runTransducer(cgToken.getLemma() + cgToken.getFirstReading());

		String searchWord = lemma;
		if(searchWordSet.iterator().hasNext()) {
			searchWord = searchWordSet.iterator().next();
		}

		addDistractors(enhancement, cgToken.getCoveredText());

		addPhoneticTranscription(enhancement, cgToken, searchWord);

		enhancement.addAttribute("hint", searchWord);

		enhancement.addAttribute("type", "hit");

		enhancement.addToCas(cas);
	}

	/**
	 * Add distractors to the enhancement, if there are at least two
	 * distractors.
	 *
	 * @param enhancement the current enhancement element
	 * @param surfaceForm the form seen on the surface
	 */
	private void addDistractors(
			ViewEnhancement enhancement,
			String surfaceForm) {
		String distractors = distractorGenerator.createWordStressDistractors(surfaceForm);

		// we only need distractors if there are at least two
		if(distractors.contains(";")){
			String[] distForms = distractors.split(";");
			String phoneticDistractors = "";
			int count = 0;
			for(String distForm : distForms) {
				Set<String> resultPhoneticSet = hfstG2P.runTransducer(distForm);
				if(resultPhoneticSet.iterator().hasNext()) {
					phoneticDistractors += resultPhoneticSet.iterator().next();
				}
				count++;
				if(count < distForms.length) {
					phoneticDistractors += ";";
				}
			}
			enhancement.addAttribute("distractors", phoneticDistractors);
		}
	}

	private void addPhoneticTranscription(ViewEnhancement enhancement, CGToken cgToken, String searchWord) {

		Set<String> resultPhoneticSet = hfstPhoneticGenerator.runTransducer(cgToken.getLemma() + cgToken.getFirstReading());

		if(resultPhoneticSet.iterator().hasNext()) {
			String trans = resultPhoneticSet.iterator().next();
			enhancement.addAttribute("phonetic-transcription", trans);
		}
		else {
			Set<String> resultG2PSet = hfstG2P.runTransducer(searchWord);

			if (resultG2PSet.iterator().hasNext()) {
				String trans = resultG2PSet.iterator().next();
				enhancement.addAttribute("phonetic-transcription", trans);
			}
		}
	}
}
