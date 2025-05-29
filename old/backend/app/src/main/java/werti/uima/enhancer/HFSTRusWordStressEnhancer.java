package werti.uima.enhancer;

import org.apache.uima.UimaContext;
import org.apache.uima.resource.ResourceInitializationException;
import werti.Language;
import werti.resources.NoResourceException;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.ae.HFSTAnnotator;
import werti.uima.types.annot.CGToken;
import werti.util.HFSTStressGenerator;
import werti.util.KryoSerialization;
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
public class HFSTRusWordStressEnhancer extends AbstractHFSTRussianEnhancer {
	// FSTUPDATE: The patterns target FST features to find or exclude specific readings
    private final Pattern posPattern = Pattern.compile("\\+N\\+|A\\+|V\\+");

    private final Pattern excludeTokenPattern = Pattern.compile("SENT|COMMA|DASH|QUOT|PAR|PUNCT|CLB");

    private final Pattern targetPattern = Pattern.compile(
            "(N\\+Msc\\+Inan\\+Sg\\+Loc2)|" +
            "(A\\+.+\\+Pred)|" +
            "(Pst\\+|Prs\\+|Fut\\+|Imp\\+)"
    );

    private final Pattern stressPattern = Pattern.compile("[\u0301\u0300\u0451\u0401]");

    private Map<String, String> lemmaToExemplarMap;

    private Map<String, MutableInt> idCounts = new HashMap<>();

    private HFSTStressGenerator hfstStressGenerator;

	@Override
	public void initialize(UimaContext context) throws ResourceInitializationException {
		super.initialize(context);
		final KryoSerialization kryoSerialization = new KryoSerialization(viewContext);
        lemmaToExemplarMap = kryoSerialization.loadMap("lemmaToExemplarMap");
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

        if(excludeTokenPattern.matcher(allReadings).find()){
            return null;
        }
        else{
            return cgToken;
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
    private ViewEnhancement createEnhancement(
            CGToken cgToken,
            Map<String, MutableInt> idCounts) {
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
            enhancement.addAttribute("lemma", lemma);
        }

        addCorrectFormAndTypes(enhancement, cgToken.getAllReadings(), lemma);

        addDistractors(enhancement, cgToken.getCoveredText());

        return enhancement;
    }

    /**
     * Add the form from the hit as correct form to the enhancement.
     *
     * @param enhancement the current enhancement element
     * @param allReadings space-delimited string of readings
     * @param lemma the lemma of the hit
     */
    private void addCorrectFormAndTypes(ViewEnhancement enhancement, String allReadings, String lemma) {
        String[] allReadingsArray = allReadings.split("\\s");

        Set<String> correctFormSet = new HashSet<>();

        String correctFormWithReading = "";

        for(String reading: allReadingsArray){
            Set<String> formsWithStressSet = hfstStressGenerator.runTransducer(reading);
            for(String formWithStress: formsWithStressSet){
                if(correctFormSet.add(formWithStress)){
                    correctFormWithReading = correctFormWithReading
                            .concat(formWithStress)
                            .concat(System.lineSeparator());
                }
                correctFormWithReading = correctFormWithReading
                        .concat(" ")
                        .concat(reading)
                        .concat(System.lineSeparator());
            }
        }

        String correctForm = correctFormSet
                .stream()
                .collect(Collectors.joining(";"));

        if(!correctForm.isEmpty()){
            enhancement.addAttribute("correctForm", correctForm);
        }

        addTypes(
                enhancement,
                correctForm,
                correctFormWithReading,
                allReadings,
                lemma
        );
    }

    /**
     * Add types to the enhancement element.
     *
     * @param enhancement the current enhancement element
     * @param correctForm the correct form(s)
     * @param correctFormWithReading the correct form(s) with readings
     * @param allReadings all readings of the hit
     * @param lemma the lemma of the hit
     */
    private void addTypes(ViewEnhancement enhancement,
                          String correctForm,
                          String correctFormWithReading,
                          String allReadings,
                          String lemma) {
        if(correctForm.contains(";")){
            enhancement.addAttribute("title", correctFormWithReading);

            enhancement.addAttribute("type", "ambiguity");
        }
        else if(correctForm.isEmpty()){
            enhancement.addAttribute("title", "This word wasn't in the lexicon!");

            enhancement.addAttribute("type", "lexicon-miss");
        }
        else if(!stressPattern.matcher(correctForm).find()){
            enhancement.addAttribute("title", "This word is unstressed!");

            enhancement.addAttribute("type", "unstressed-word");
        }
        else{
            addHitAndMcTargetType(enhancement, allReadings, lemma);
        }
    }

    /**
     * Add hit and mc-target type to the enhancement element, if possible.
     *
     * @param enhancement the current enhancement element
     * @param allReadings all readings of the hit
     * @param lemma the lemma of the hit
     */
    private void addHitAndMcTargetType(ViewEnhancement enhancement, String allReadings, String lemma){
        Set<String> posSet = new HashSet<>();

        Matcher posMatcher = posPattern.matcher(allReadings);

        while(posMatcher.find()){
            posSet.add(posMatcher.group());
        }

        if(posSet.size() == 1 &&
                lemmaToExemplarMap.containsKey(lemma) &&
                targetPattern.matcher(allReadings).find()){
            enhancement.addAttribute("type", "mc-target");
            addContClassAndExemplar(enhancement, lemma);
        }
        else{
            enhancement.addAttribute("type", "hit");
        }
    }

    /**
     * Add the attributes continuation class and exemplar to the enhancement.
     *
     * @param enhancement the current enhancement element
     * @param lemma the lemma of the hit
     */
    private void addContClassAndExemplar(ViewEnhancement enhancement, String lemma) {
        String[] exemplarInfo = lemmaToExemplarMap.get(lemma).split("ñôŃßĘńŠē");

        if(exemplarInfo.length == 2){
            enhancement.addAttribute("contClass", exemplarInfo[0]);

            enhancement.addAttribute("exemplar", exemplarInfo[1]);
        }
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
            enhancement.addAttribute("distractors", distractors);
        }
    }
}
