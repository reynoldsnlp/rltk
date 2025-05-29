package werti.uima.enhancer;

import org.apache.uima.UimaContext;
import org.apache.uima.resource.ResourceInitializationException;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import werti.Language;
import werti.resources.NoResourceException;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.ae.HFSTAnnotator;
import werti.util.HFSTStressGenerator;
import werti.uima.types.annot.CGToken;
import werti.util.KryoSerialization;
import werti.util.MutableInt;
import werti.uima.enhancer.translation.*;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The output from the CG3 analysis from {@link HFSTAnnotator}
 * is being used to enhance spans corresponding to the tags specified by the topic
 * and the activity that was chosen by the user. 
 * In this case the topic is Russian adjectives in feminine form, use the patterns
 * in the method process() to extract the correct tokens for enhancement.
 * 
 * @author Niels Ott
 * @author Adriane Boyd
 * @author Heli Uibo
 * @author Eduard Schaf
 * @author Konnor Petersen
 *
 */
public class HFSTRusAssistiveReadingEnhancer extends AbstractHFSTRussianEnhancer {
	private static final Logger log = LogManager.getLogger();

	Pattern posPattern = Pattern.compile("\\+(N|A|V|Pron|Det|Num|Num\\+Ord)\\+");
	Pattern posIndeclPattern = Pattern.compile("\\+(Abbr|Adv.*|CC|CS|Interj|Paren|Pcle|Po|Pr)\\b");
	Pattern aspectPattern = Pattern.compile("Impf|Perf");
	Pattern transitivityPattern = Pattern.compile("TV|IV");
	Pattern tenseVoicePattern = Pattern.compile("(Prs|Pst)(Act|Pss)");

	private HFSTStressGenerator hfstStressGenerator;

	private Map<String, werti.util.MutableInt> idCounts = new HashMap<>();

	@Override
	public void initialize(UimaContext context) throws ResourceInitializationException {
		super.initialize(context);

		if(lemmaToTranslationsMap == null) {
			final KryoSerialization kryoSerialization = new KryoSerialization(viewContext);
			lemmaToTranslationsMap = kryoSerialization.loadTranslationMap();
		}

		try {
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
		CGToken hitCGToken = checkForHit(cgToken);

		if(hitCGToken != null){
			processHit(cgToken, cas);
		}
	}

	/**
	 * Checks if a reading can be selected as hit.
	 * Selects first match, but continues to check the
	 * remaining readings in case of a contradicting reading.
	 *
	 * @param cgToken the cg token being checked
	 * @return the cg token, given that it matched the pos and filters,
	 * null otherwise
	 */
	private CGToken checkForHit(CGToken cgToken) {
		String allReadings = cgToken.getAllReadings();

		if(allReadings.length() > 0 && (posPattern.matcher(allReadings).find() || posIndeclPattern.matcher(allReadings).find())) {
			return cgToken;
		}
		else {
			return null;
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
		final ViewEnhancement enhancement = createEnhancement(cgToken, idCounts);

		enhancement.addToCas(cas);
	}

	/**
	 * Create a view enhancement tag containing:
	 * - id
	 * - lemma
	 * - correctForm
	 * - distractors
	 * - type
	 *
	 * @param cgToken the cg token the reading was selected from
	 * @param idCounts the map recording the id counts for enhancements
	 * @return a common view enhancement tag
	 */
	private ViewEnhancement createEnhancement(CGToken cgToken, Map<String, MutableInt> idCounts) {
		String lemma = cgToken.getLemma();

		String hitFeatures = cgToken.getFirstReading();

		final ViewEnhancement enhancement = new ViewEnhancement(cgToken);

		if(hitFeatures.isEmpty()){
			enhancement.addAttribute("id", enhancerUtils.getId("+" + cgToken.getCoveredText(), idCounts));
		}
		else{
			enhancement.addAttribute("id", enhancerUtils.getId(hitFeatures, idCounts));
		}

		if(lemma != null){
			lemma = lemma.replaceAll("[¹²³⁴⁵⁶⁷⁸⁹⁰]", "");
			enhancement.addAttribute("lemma", lemma);
			Word wordTranslation = lemmaToTranslationsMap.get(lemma);
			if(wordTranslation != null) {
				String translation = "";
				for(Sense sense : wordTranslation.getSenses()) {
					if(sense != null && sense.getGlosses() != null) {
						for(String gloss : sense.getGlosses()) {
							translation += gloss + ",";
						}
						translation = translation.substring(0, translation.length() - 1);
						translation += "; ";
					}
				}
				if(translation.endsWith("; ")) {
					translation = translation.substring(0, translation.length() - 2);
				}
				enhancement.addAttribute("translation", translation);
			}
		}

		processReadingsAndAddPOS(cgToken, enhancement);

		enhancement.addAttribute("type", "hit");

		return enhancement;
	}

	private void processReadingsAndAddPOS(CGToken cgToken, ViewEnhancement enhancement) {
		boolean isValidReading = false;
		String reading_str = "";
		List<String> paradigmReadingsList = new ArrayList<String>();
		Set<String> distinctElementSet = new HashSet<String>();

		List<String> readingsList = new ArrayList<String>(Arrays.asList(cgToken.getAllReadings().split(" ")));

		// select from all readings the first occurrence that is matching pos and number
		for(int i = 0; i < readingsList.size(); i++){
			String currentReadingString = readingsList.get(i);
			if(currentReadingString.length() < 1) continue;
			if(currentReadingString.contains("\\+Fac") || currentReadingString.contains("\\+Prb")) continue;
			// remove the first "+" and quotes
			currentReadingString = currentReadingString.replace("\"", "");
			String[] tags = currentReadingString.split("\\+");
			String firstTag = tags[0];
			// ruled out readings have ";" as first tag
			if(!firstTag.equals(";")){
				// it is a disambiguated reading
				Matcher posMatcher = posPattern.matcher(currentReadingString);
				if(posMatcher.find()){
					String readingLemma = firstTag;
					String pos = posMatcher.group(1);
					String distinctElement = readingLemma + "+" + pos;
					// FSTUPDATE: Verbs need additional distinctive features
					if(pos.equals("V")){ // verb
						Matcher aspectMatcher = aspectPattern.matcher(currentReadingString);
						Matcher transitivityMatcher = transitivityPattern.matcher(currentReadingString);
						Matcher tenseVoiceMatcher = tenseVoicePattern.matcher(currentReadingString);
						if(aspectMatcher.find()){
							distinctElement += "+" + aspectMatcher.group();
						}
						if(transitivityMatcher.find()){
							distinctElement += "+" + transitivityMatcher.group();
						}
						if(tenseVoiceMatcher.find()){
							distinctElement += "+" + tenseVoiceMatcher.group();
						}
					}
					// only add readings with distinct element to the list
					if(distinctElementSet.add(distinctElement)){
						paradigmReadingsList.add(currentReadingString);
					}

					if(!isValidReading){
						isValidReading = true;
						reading_str = currentReadingString;
					}
				}

				Matcher posIndeclMatcher = posIndeclPattern.matcher(currentReadingString);
				if(posIndeclMatcher.find() && !isValidReading){
					isValidReading = true;
					reading_str = currentReadingString;
				}
			}
		}

		if(isValidReading){
			Set<String> correctFormSet = hfstStressGenerator.runTransducer(reading_str);
			if(!correctFormSet.isEmpty()) {
				enhancement.addAttribute("correct-form", correctFormSet.iterator().next());
			}

			String stressedLemma = createStressedLemma(reading_str, enhancement);
			if(stressedLemma != null) {
				enhancement.addAttribute("stressed-lemma", stressedLemma);
			}

			enhancement.addAttribute("correct-reading", reading_str);

			String paradigms = createParadigms(paradigmReadingsList);
			if(paradigms != null && paradigms.length() > 0) {
				enhancement.addAttribute("paradigms", paradigms);
			}
		}

		if(reading_str.endsWith("+Pr") || reading_str.contains("+Pr+")) {
			if(reading_str.contains("+Epenth")) {
				reading_str.replace("+Epenth", "");
			}
			else {
				reading_str += "+Epenth";
			}
			Set<String> epenthWordSet = hfstStressGenerator.runTransducer(reading_str);
			if(!epenthWordSet.isEmpty()) {
				enhancement.addAttribute("epenth", epenthWordSet.iterator().next());
			}
		}
	}

	/*
	 * Create stressed lemma based on reading tags and pos
	 */
	private String createStressedLemma(String reading_str, ViewEnhancement enhancement) {
		String lemma = reading_str.split("\\+")[0];
		String stressedLemmaReading = lemma;

		if((reading_str.contains("+A+") || reading_str.contains("Num+") || reading_str.contains("Det+"))) {
			if(reading_str.contains("+A+")) {
				stressedLemmaReading += "+A";
				stressedLemmaReading += "+Msc+AnIn+Sg+Nom";
			}
			else if(reading_str.contains("Num+")) {
				stressedLemmaReading += "+Num";
				if(reading_str.contains("+Ord")) {
					stressedLemmaReading += "+Ord";
				}
				if(lemma.equals("два") || lemma.equals("оба") || lemma.equals("полтора")) {
					stressedLemmaReading += "+Msc+AnIn";
				}
				else {
					stressedLemmaReading += "+MFN+AnIn";
				}
				if(reading_str.contains("+Ord")) {
					stressedLemmaReading += "+Sg";
				}
				stressedLemmaReading += "+Nom";
			}
			else if(reading_str.contains("Det+")) {
				stressedLemmaReading += "+Det";
				stressedLemmaReading += "+Msc+AnIn+Sg+Nom";
			}
		}
		else if(reading_str.contains("+V+")) {
			stressedLemmaReading += "+V";
			if(reading_str.contains("+Impf")) {
				stressedLemmaReading += "+Impf";
			}
			else if(reading_str.contains("+Perf")) {
				stressedLemmaReading += "+Perf";
			}
			stressedLemmaReading += "+Inf";
		}
		else if(reading_str.contains("+N+") || reading_str.contains("Pron+")) {

			if(reading_str.contains("+N+")) {
				stressedLemmaReading += "+N";
				if(reading_str.contains("+Msc")) {
					stressedLemmaReading += "+Msc";
				}
				else if(reading_str.contains("+Neu")) {
					stressedLemmaReading += "+Neu";
				}
				else if(reading_str.contains("+Fem")) {
					stressedLemmaReading += "+Fem";
				}
				else if(reading_str.contains("+MFN")) {
					stressedLemmaReading += "+MFN";
				}
				stressedLemmaReading += "+Inan";
			}
			else if(reading_str.contains("Pron+")) {
				stressedLemmaReading += "+Pron";
				if(reading_str.contains("+Pers")) {
					stressedLemmaReading += "+Pers";
				}
				if(reading_str.contains("+Msc")) {
					stressedLemmaReading += "+Msc";
				}
				else if(reading_str.contains("+Neu")) {
					stressedLemmaReading += "+Neu";
				}
				else if(reading_str.contains("+Fem")) {
					stressedLemmaReading += "+Fem";
				}
				else if(reading_str.contains("+MFN")) {
					stressedLemmaReading += "+MFN";
				}
				if(reading_str.contains("+AnIn") || reading_str.contains("+Anim") || reading_str.contains("+Inan")) {
					stressedLemmaReading += "+AnIn";
				}
			}
			if(reading_str.contains("+Sg2")) {
				stressedLemmaReading += "+Sg2";
			}
			else {
				stressedLemmaReading += "+Sg";
			}
			stressedLemmaReading += "+Nom";
			if(lemma.equals("один")) {
				stressedLemmaReading = "один+Num+Msc+AnIn+Sg+Nom";
			}
		}
		else {
			stressedLemmaReading = reading_str;
		}

		//stressedLemmaReading = stressedLemmaReading.replaceAll("[¹²³⁴⁵⁶⁷⁸⁹⁰]", "");
		//enhancement.addAttribute("stressedReading", stressedLemmaReading);

		Set<String> stressedLemmaSet = hfstStressGenerator.runTransducer(stressedLemmaReading);
		if(!stressedLemmaSet.isEmpty()) {
			return stressedLemmaSet.iterator().next();
		}
		return null;
	}

	/*
	 * Create all relevant morphological forms of the current token
	 * It is the input for the distractor generation  достигнутое+N+Neu+AnIn+Sg+Nom
	 */
	private String createParadigms(List<String> paradigmReadingsList) {
		// FSTUPDATE: The paradigms are created by constructing all readings after identifying the POS
		String generationInputAll = "";
		ArrayList<ArrayList<String>> generationInputAllList = new ArrayList<ArrayList<String>>();
		ArrayList<String> generationInputAllStringList = new ArrayList<String>();

		// create for each reading a paradigm
		for(String paradigmReading: paradigmReadingsList){
			String generationInput = "";
			String lemma = paradigmReading.split("\\+")[0];

			if(paradigmReading.contains("+Cmpar")) {
				paradigmReading = lemma + "+A+Fem+AnIn+Sg+Nom";
			}

			if(paradigmReading.contains("+A+")
					|| paradigmReading.contains("Num+") 
					|| paradigmReading.contains("Det+")){// adjective, ordinal number, determiner
				String[] caseTags = {"+Nom", "+Acc", "+Gen", "+Loc", "+Dat", "+Ins", "+Pred"};
				String[] genderTags = {"+Msc", "+Neu", "+Fem", "+MFN"};

				for(String caseTag: caseTags){

					if(paradigmReading.contains(caseTag)){
						String reading = paradigmReading;

						if(reading.contains("Anim")||
								reading.contains("Inan")){
							// change the animacy marker to AnIn
							reading = reading.replace("+Anim", "+AnIn").replace("+Inan", "+AnIn");
						}
						// add animacy tag for short form paradigm readings
						if(caseTag.equals("+Pred")){
							reading = reading.replace("+Sg", "+AnIn+Sg").replace("+Pl", "+AnIn+Pl");
						}

						// Assign case tags from the array 
						for(String aCase: caseTags) {
							// don't include short forms for ordinal numbers and determiner
							if(aCase.equals("+Pred")){
								if(paradigmReading.contains("Num+") 
										|| paradigmReading.contains("Det+"))	{
									continue;
								}
								// remove animacy tag for short forms
								generationInput += reading.replace(caseTag, aCase).replace("+AnIn", "") + ",";
								continue;
							}
							else if(aCase.equals("+Acc")){
								// add all possible animacy readings
								generationInput += reading.replace(caseTag, aCase) + ",";
								generationInput += reading.replace(caseTag, aCase).replace("+AnIn", "+Anim") + ",";
								generationInput += reading.replace(caseTag, aCase).replace("+AnIn", "+Inan") + ",";
							}
							else if(aCase.equals("+Ins")){
								generationInput += reading.replace(caseTag, aCase) + ",";
								// add the +Leng reading
								generationInput += reading.replace(caseTag, aCase + "+Leng") + ",";
							}
							else{
								generationInput += reading.replace(caseTag, aCase) + ",";
							}
						}

						break;
					}
				}

				// create all forms for the other genders
				for(String genderTag: genderTags){
					if(paradigmReading.contains(genderTag)){
						String generationInputAllOtherGender = "";
						String generationInputOtherGender = "";
						// Assign gender tags from the array 
						for(String aGender: genderTags) {
							if(!aGender.equals(genderTag)){
								// generate other gender forms from the generation input
								generationInputOtherGender = generationInput.replace(genderTag, aGender);
								if(aGender.equals("+MFN")){
									// change singular forms to plural forms
									generationInputOtherGender = generationInputOtherGender.replace("+Sg+", "+Pl+");
								}
								if(genderTag.equals("+MFN")){
									// change plural forms to singular forms
									generationInputOtherGender = generationInputOtherGender.replace("+Pl+", "+Sg+");
								}
								// add the other gender forms to all other gender forms
								generationInputAllOtherGender += generationInputOtherGender;
							}
						}
						// add all the other gender forms to the generation input
						generationInput += generationInputAllOtherGender;

						break;
					}
				}

				// Add the comparative form (only adjectives)
				if(paradigmReading.contains("+A+"))	{
					generationInput += lemma + "+A+Cmpar+Pred,";
				}

				//    	        log.info("generationInput(A)="+generationInput);
			}
			else if(paradigmReading.contains("+V+")){ // verb
				String[] formsPresentOrFuture = {"+Sg1", "+Sg2", "+Sg3", "+Pl1", "+Pl2", "+Pl3"};
				String[] formsPast = {"+Msc+Sg", "+Neu+Sg", "+Fem+Sg", "+MFN+Pl"};
				String[] formsImperative = {"+Sg2", "+Pl2"};
				String[] participleTypes = {"+PrsAct", "+PrsPss", "+PstAct", "+PstPss"};
//				log.info("Verb paradigm reading=" + paradigmReading);

				// generate all verb forms according to tense
				if(paradigmReading.contains("Prs+")){ // present
					String tenseTag = "+Prs";

					for(String personTag: formsPresentOrFuture){

						if(paradigmReading.contains(personTag)){

							// generate present tense forms
							for (String aPerson: formsPresentOrFuture) {
								generationInput += paradigmReading.replace(personTag, aPerson) + ",";
							}
							
							// generate future tense forms
							if(paradigmReading.contains("+Perf") || lemma.contains("быть")){
								for (String aPerson: formsPresentOrFuture) {
									generationInput += paradigmReading.replace(personTag, aPerson).replace(tenseTag, "+Fut") + ",";
								}
							}

							// generate past tense forms
							for(String aGenderAndNumber: formsPast){
								generationInput += paradigmReading.replace(personTag, aGenderAndNumber).replace(tenseTag, "+Pst") + ",";
							}

							// generate imperative forms
							for (String aPerson: formsImperative) {
								generationInput += paradigmReading.replace(personTag, aPerson).replace(tenseTag, "+Imp") + ",";
							}

							// generate verbal adverbs and the infinitive
							// remove tense tags
							String reading = paradigmReading.replace(tenseTag, "");
							// replace the person tag with the infinitive tag
							generationInput += reading.replace(personTag, "+Inf") + ",";
							// replace the person tag with verbal adverb tags
							generationInput += reading.replace(personTag, "+PrsAct+Adv") + ",";
							generationInput += reading.replace(personTag, "+PstAct+Adv") + ",";
							
							// generate participles
							for (String aParticipleType: participleTypes) {
								generationInput += reading.replace(personTag, aParticipleType + "+Msc+AnIn+Sg+Nom") + ",";
							}

							break;
						}
					}
				}
				if(paradigmReading.contains("Fut+")){ // future
					String tenseTag = "+Fut";

					for(String personTag: formsPresentOrFuture){

						if(paradigmReading.contains(personTag)){

							// generate present tense forms
							if(paradigmReading.contains("+Impf")){
								for (String aPerson: formsPresentOrFuture) {
									generationInput += paradigmReading.replace(personTag, aPerson).replace(tenseTag, "+Prs") + ",";
								}
							}
							
							// generate future tense forms
							for (String aPerson: formsPresentOrFuture) {
								generationInput += paradigmReading.replace(personTag, aPerson) + ",";
							}

							// generate past tense forms
							for(String aGenderAndNumber: formsPast){
								generationInput += paradigmReading.replace(personTag, aGenderAndNumber).replace(tenseTag, "+Pst") + ",";
							}

							// generate imperative forms
							for (String aPerson: formsImperative) {
								generationInput += paradigmReading.replace(personTag, aPerson).replace(tenseTag, "+Imp") + ",";
							}

							// generate verbal adverbs and the infinitive
							// remove tense tags
							String reading = paradigmReading.replace(tenseTag, "");
							// replace the person tag with the infinitive tag
							generationInput += reading.replace(personTag, "+Inf") + ",";
							// replace the person tag with verbal adverb tags
							generationInput += reading.replace(personTag, "+PrsAct+Adv") + ",";
							generationInput += reading.replace(personTag, "+PstAct+Adv") + ",";
							
							// generate participles
							for (String aParticipleType: participleTypes) {
								generationInput += reading.replace(personTag, aParticipleType + "+Msc+AnIn+Sg+Nom") + ",";
							}

							break;
						}
					}
				}
				else if(paradigmReading.contains("Pst+")){ // past
					String tenseTag = "+Pst";

					for(String genderAndNumberTag: formsPast){

						if(paradigmReading.contains(genderAndNumberTag)){

							// generate present tense forms
							if(paradigmReading.contains("+Impf")){
								for (String aPerson: formsPresentOrFuture) {
									generationInput += paradigmReading.replace(genderAndNumberTag, aPerson).replace(tenseTag, "+Prs") + ",";
								}
							}
							
							// generate future tense forms
							if(paradigmReading.contains("+Perf") || lemma.contains("быть")){
								for (String aPerson: formsPresentOrFuture) {
									generationInput += paradigmReading.replace(genderAndNumberTag, aPerson).replace(tenseTag, "+Fut") + ",";
								}
							}

							// generate past tense forms
							for(String aGenderAndNumber: formsPast){
								generationInput += paradigmReading.replace(genderAndNumberTag, aGenderAndNumber) + ",";
							}

							// generate imperative forms
							for (String aPerson: formsImperative) {
								generationInput += paradigmReading.replace(genderAndNumberTag, aPerson).replace(tenseTag, "+Imp") + ",";
							}

							// generate verbal adverbs and the infinitive
							// remove tense tags
							String reading = paradigmReading.replace(tenseTag, "");
							// replace the person tag with the infinitive tag
							generationInput += reading.replace(genderAndNumberTag, "+Inf") + ",";
							// replace the person tag with verbal adverb tags
							generationInput += reading.replace(genderAndNumberTag, "+PrsAct+Adv") + ",";
							generationInput += reading.replace(genderAndNumberTag, "+PstAct+Adv") + ",";
							
							// generate participles
							for (String aParticipleType: participleTypes) {
								generationInput += reading.replace(genderAndNumberTag, aParticipleType + "+Msc+AnIn+Sg+Nom") + ",";
							}

							break;
						}
					}
				}
				else if(paradigmReading.contains("+Inf")){ // infinitive
					String tenseTag = "+Inf";

					// generate present tense forms
					if(paradigmReading.contains("+Impf")){
						for (String aPerson: formsPresentOrFuture) {
							generationInput += paradigmReading.replace(tenseTag, "+Prs" + aPerson) + ",";
						}
					}
					
					// generate future tense forms
					if(paradigmReading.contains("+Perf") || lemma.contains("быть")){
						for (String aPerson: formsPresentOrFuture) {
							generationInput += paradigmReading.replace(tenseTag, "+Fut" + aPerson) + ",";
						}
					}

					// generate past tense forms
					for(String aGenderAndNumber: formsPast){
						generationInput += paradigmReading.replace(tenseTag, "+Pst" + aGenderAndNumber) + ",";
					}

					// generate imperative forms
					for (String aPerson: formsImperative) {
						generationInput += paradigmReading.replace(tenseTag, "+Imp" + aPerson) + ",";
					}

					// generate verbal adverbs and the infinitive
					// add the infinitive
					generationInput += paradigmReading + ",";
					// replace the person tag with verbal adverb tags
					generationInput += paradigmReading.replace(tenseTag, "+PrsAct+Adv") + ",";
					generationInput += paradigmReading.replace(tenseTag, "+PstAct+Adv") + ",";
					
					// generate participles
					for (String aParticipleType: participleTypes) {
						generationInput += paradigmReading.replace(tenseTag, aParticipleType + "+Msc+AnIn+Sg+Nom") + ",";
					}
					
				}
				else if(paradigmReading.contains("Imp+")){ // imperative
					String tenseTag = "+Imp+";
	             	
	             	for(String personTag: formsImperative){
	             		
	                 	if(paradigmReading.contains(personTag)){
	                 		
	                 		// generate present tense forms
							if(paradigmReading.contains("+Impf")){
								for (String aPerson: formsPresentOrFuture) {
									generationInput += paradigmReading.replace(personTag, aPerson).replace(tenseTag, "+Prs+") + ",";
								}
							}
							
							// generate future tense forms
							if(paradigmReading.contains("+Perf") || lemma.contains("быть")){
								for (String aPerson: formsPresentOrFuture) {
									generationInput += paradigmReading.replace(personTag, aPerson).replace(tenseTag, "+Fut+") + ",";
								}
							}

							// generate past tense forms
							for(String aGenderAndNumber: formsPast){
								generationInput += paradigmReading.replace(personTag, aGenderAndNumber).replace(tenseTag, "+Pst+") + ",";
							}

							// generate imperative forms
							for (String aPerson: formsImperative) {
								generationInput += paradigmReading.replace(personTag, aPerson) + ",";
							}

							// generate verbal adverbs and the infinitive
							// remove tense tags
							String reading = paradigmReading.replace(tenseTag, "+");
							// replace the person tag with the infinitive tag
							generationInput += reading.replace(personTag, "+Inf") + ",";
							// replace the person tag with verbal adverb tags
							generationInput += reading.replace(personTag, "+PrsAct+Adv") + ",";
							generationInput += reading.replace(personTag, "+PstAct+Adv") + ",";
							
							// generate participles
							for (String aParticipleType: participleTypes) {
								generationInput += reading.replace(personTag, aParticipleType + "+Msc+AnIn+Sg+Nom") + ",";
							}

							break;
	                 	}
	                 }
	             }
				else if(paradigmReading.contains("+Adv")){ // verbal adverb
					String tenseTag = "";
					
					// determine the tense
					if(paradigmReading.contains("+PrsAct")){
						tenseTag = "+PrsAct";
					}
					else if(paradigmReading.contains("+PstAct")){
						tenseTag = "+PstAct";
					}
					
					int tenseTagIndex = paradigmReading.indexOf(tenseTag);
					
					// the reading tag sequence starting from the tensetag
					String fromTenseTagToEnd = paradigmReading.substring(tenseTagIndex);

					// generate present tense forms
					if(paradigmReading.contains("+Impf")){
						for (String aPerson: formsPresentOrFuture) {
							generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Prs" + aPerson) + ",";
						}
					}
					
					// generate future tense forms
					if(paradigmReading.contains("+Perf") || lemma.contains("быть")){
						for (String aPerson: formsPresentOrFuture) {
							generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Fut" + aPerson) + ",";
						}
					}

					// generate past tense forms
					for(String aGenderAndNumber: formsPast){
						generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Pst" + aGenderAndNumber) + ",";
					}

					// generate imperative forms
					for (String aPerson: formsImperative) {
						generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Imp" + aPerson) + ",";
					}

					// generate verbal adverbs and the infinitive
					// replace the tenseTag tag with the infinitive tag
					generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Inf") + ",";
					// replace the tenseTag tag with verbal adverb tags
					generationInput += paradigmReading.replace(fromTenseTagToEnd, "+PrsAct+Adv") + ",";
					generationInput += paradigmReading.replace(fromTenseTagToEnd, "+PstAct+Adv") + ",";
					
					// generate participles
					for (String aParticipleType: participleTypes) {
						generationInput += paradigmReading.replace(fromTenseTagToEnd, aParticipleType + "+Msc+AnIn+Sg+Nom") + ",";
					}
				}
				else if(paradigmReading.contains("Act+")||
						paradigmReading.contains("Pss+")){ // participle
					String tenseTag = "";
					
					// determine the tense
					if(paradigmReading.contains("+PrsAct")){
						tenseTag = "+PrsAct";
					}
					else if(paradigmReading.contains("+PstAct")){
						tenseTag = "+PstAct";
					}
					else if(paradigmReading.contains("+PrsPss")){
						tenseTag = "+PrsPss";
					}
					else if(paradigmReading.contains("+PstPss")){
						tenseTag = "+PstPss";
					}
					
					int tenseTagIndex = paradigmReading.indexOf(tenseTag);
					
					// the reading tag sequence starting from the tensetag
					String fromTenseTagToEnd = paradigmReading.substring(tenseTagIndex);

					// generate present tense forms
					if(paradigmReading.contains("+Impf")){
						for (String aPerson: formsPresentOrFuture) {
							generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Prs" + aPerson) + ",";
						}
					}
					
					// generate future tense forms
					if(paradigmReading.contains("+Perf") || lemma.contains("быть")){
						for (String aPerson: formsPresentOrFuture) {
							generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Fut" + aPerson) + ",";
						}
					}

					// generate past tense forms
					for(String aGenderAndNumber: formsPast){
						generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Pst" + aGenderAndNumber) + ",";
					}

					// generate imperative forms
					for (String aPerson: formsImperative) {
						generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Imp" + aPerson) + ",";
					}

					// generate verbal adverbs and the infinitive
					// replace the tenseTag tag with the infinitive tag
					generationInput += paradigmReading.replace(fromTenseTagToEnd, "+Inf") + ",";
					// replace the tenseTag tag with verbal adverb tags
					generationInput += paradigmReading.replace(fromTenseTagToEnd, "+PrsAct+Adv") + ",";
					generationInput += paradigmReading.replace(fromTenseTagToEnd, "+PstAct+Adv") + ",";
					
					// generate participles
					// determine the gender
					String genderTag = "";
					if(fromTenseTagToEnd.contains("+Msc")){
						genderTag = "+Msc";
					}
					else if(fromTenseTagToEnd.contains("+Fem")){
						genderTag = "+Fem";
					}
					else if(fromTenseTagToEnd.contains("+Neu")){
						genderTag = "+Neu";
					}
					else if(fromTenseTagToEnd.contains("+MFN")){
						genderTag = "+MFN";
					}
					
					int genderTagIndex = fromTenseTagToEnd.indexOf(genderTag);
					
					// the reading tag sequence starting from the gender tag
					String fromGenderTagToEnd = fromTenseTagToEnd.substring(genderTagIndex);
					for (String aParticipleType: participleTypes) {
						if(tenseTag.equals(aParticipleType)){
							// generate the whole paradigm of the current participle type
							String[] caseTags = {"+Nom", "+Acc", "+Gen", "+Loc", "+Dat", "+Ins", "+Pred"};
							String[] genderTags = {"+Msc", "+Neu", "+Fem", "+MFN"};
							
							String participleGenerationInput = "";

							for(String caseTag: caseTags){

								if(paradigmReading.contains(caseTag)){
									String reading = paradigmReading;

									if(reading.contains("Anim")||
											reading.contains("Inan")){
										// change the animacy marker to AnIn
										reading = reading.replace("+Anim", "+AnIn").replace("+Inan", "+AnIn");
									}
									// add animacy tag for short form paradigm readings
									if(caseTag.equals("+Pred")){
										reading = reading.replace("+Sg", "+AnIn+Sg").replace("+Pl", "+AnIn+Pl");
									}

									// Assign case tags from the array 
									for(String aCase: caseTags) {
										// don't include short forms for ordinal numbers and determiner
										if(aCase.equals("+Pred")){
											// remove animacy tag for short forms
											participleGenerationInput += reading.replace(caseTag, aCase).replace("+AnIn", "") + ",";
											continue;
										}
										else if(aCase.equals("+Acc")){
											// add all possible animacy readings
											participleGenerationInput += reading.replace(caseTag, aCase) + ",";
											participleGenerationInput += reading.replace(caseTag, aCase).replace("+AnIn", "+Anim") + ",";
											participleGenerationInput += reading.replace(caseTag, aCase).replace("+AnIn", "+Inan") + ",";
										}
										else if(aCase.equals("+Ins")){
											participleGenerationInput += reading.replace(caseTag, aCase) + ",";
											// add the +Leng reading
											participleGenerationInput += reading.replace(caseTag, aCase + "+Leng") + ",";
										}
										else{
											participleGenerationInput += reading.replace(caseTag, aCase) + ",";
										}
									}

									break;
								}
							}

							// create all forms for the other genders
							for(String aGenderTag: genderTags){
								if(paradigmReading.contains(aGenderTag)){
									String generationInputAllOtherGender = "";
									String generationInputOtherGender = "";
									// Assign gender tags from the array 
									for(String aGender: genderTags) {
										if(!aGender.equals(aGenderTag)){
											// generate other gender forms from the generation input
											generationInputOtherGender = participleGenerationInput.replace(aGenderTag, aGender);
											if(aGender.equals("+MFN")){
												// change singular forms to plural forms
												generationInputOtherGender = generationInputOtherGender.replace("+Sg+", "+Pl+");
											}
											if(aGenderTag.equals("+MFN")){
												// change plural forms to singular forms
												generationInputOtherGender = generationInputOtherGender.replace("+Pl+", "+Sg+");
											}
											// add the other gender forms to all other gender forms
											generationInputAllOtherGender += generationInputOtherGender;
										}
									}
									// add all the other gender forms to the generation input
									participleGenerationInput += generationInputAllOtherGender;

									break;
								}
							}
							
							// add all participle forms to the generation input
							generationInput += "ñôŃßĘńŠēPARTICIPLESTART," + participleGenerationInput + "ñôŃßĘńŠēPARTICIPLEEND,";

						}
						else{
							// generate other participle type forms (only Msc AnIn Sg Nom)
							generationInput += paradigmReading.replace(tenseTag, aParticipleType).replace(fromGenderTagToEnd, "+Msc+AnIn+Sg+Nom") + ",";
						}
					}
				}

				//    			log.info("generationInput(V)="+generationInput);
			}
			else if(paradigmReading.contains("+N+")
					|| paradigmReading.contains("Pron+")){ // noun, pronoun
				// +Loc2 and +Gen2 must come before +Gen and +Loc in this array,
				// otherwise +Loc and +Gen will match the +Loc2 and +Gen2 tags respectively
				String[] caseTags = {"+Nom", "+Acc", "+Loc2", "+Gen2", "+Gen", "+Loc", "+Dat", "+Ins", "+Voc"};

				for(String caseTag: caseTags){

					if(paradigmReading.contains(caseTag)){
						// Assign case tags from the array 
						for(String aCase: caseTags) {
							// pronouns never have the case tags Loc2, Gen2 and Voc, stop the loop
							if(paradigmReading.contains("Pron+")){
								if(aCase.equals("+Loc2") || aCase.equals("+Gen2") || aCase.equals("+Voc")){
									break;
								}
							}
							String regexTag = "\\" + caseTag + "\\b";
							generationInput += paradigmReading.replaceAll(regexTag, aCase) + ",";
						}

						break;
					}
				}

				// sg and pl forms for nouns
				if(paradigmReading.contains("+N+")){
					// Generate other number forms
					String generationInputOtherNumber = "";
					if(paradigmReading.contains("+Sg+")){
						generationInputOtherNumber = generationInput.replace("+Sg+", "+Pl+");
					}
					else{
						generationInputOtherNumber = generationInput.replace("+Pl+", "+Sg+");
					}  

					// Add the plural forms to the generation input
					generationInput += generationInputOtherNumber;  				
				}

				//    	        log.info("generationInput(N, Pron)="+generationInput);
			}
			if(!generationInput.isEmpty()){
				Set<String> correctFormSet = new HashSet<String>();
				ArrayList<String> comparableCorrectFormList = new ArrayList<String>();

				String generationOutput = "ñôŃßĘńŠēNEWPARADIGM,";
				for(String reading : generationInput.split(",")) {
					generationOutput += reading;
					correctFormSet = hfstStressGenerator.runTransducer(reading);
					if(correctFormSet.iterator().hasNext()) {
						String nextCorrectForm = correctFormSet.iterator().next();
						generationOutput += ":" + nextCorrectForm + ",";
						comparableCorrectFormList.add(nextCorrectForm);
					}
					else {
						generationOutput += ",";
						comparableCorrectFormList.add("");
					}
				}
				generationOutput += "ñôŃßĘńŠēPARADIGMEND,";
				generationInput = generationOutput;

				// Compare paradigm readings to determine which ones to send to webextension
				if(!generationInputAllList.isEmpty()) {
					boolean addListToGenerationList = true;
					boolean replacedListInGenerationList = false;
					for(int i = 0; i < generationInputAllList.size(); i++) {
						Iterator<String> listIter = generationInputAllList.get(i).iterator();
						Iterator<String> compListIter = comparableCorrectFormList.iterator();
						int differenceCount = 0;
						while(listIter.hasNext() && compListIter.hasNext()) {
							String listString = listIter.next();
							String compString = compListIter.next();
							if(listString == null && compString == null) {
								continue;
							}
							else if(listString != null && compString == null) {
								differenceCount += 1;
							}
							else if(listString == null && compString != null) {
								differenceCount += 1;
							}
							else if(!listString.equals(compString)) {
								differenceCount += 1;
							}
						}

						if(differenceCount <= 3) {
							replacedListInGenerationList = true;
							generationInputAllList.set(i, comparableCorrectFormList);
							generationInputAllStringList.set(i, generationInput);
						}
						else if(differenceCount > 3) {
							addListToGenerationList = true;
						}
					}
					if(replacedListInGenerationList == false && addListToGenerationList == true) {
						generationInputAllList.add(comparableCorrectFormList);
						generationInputAllStringList.add(generationInput);
					}
				} else {
					generationInputAllList.add(comparableCorrectFormList);
					generationInputAllStringList.add(generationInput);
				}
			}
		}

		for(String str: generationInputAllStringList) {
			generationInputAll += str;
		}

		return generationInputAll;
	}


}

