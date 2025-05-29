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
public class HFSTRusNounEnhancer extends AbstractHFSTRussianEnhancer {
    private static final String TOPIC = "nouns";

    // FSTUPDATE: The patterns target FST features to find or exclude specific readings
    private final Pattern posPattern = Pattern.compile("\\+N\\+");
    private final Pattern filterPattern = Pattern.compile("Sg|Pl");
    // Note that the whole token will be excluded, even when one reading is valid
    private final Pattern excludeTokenPattern = Pattern.compile("V\\+|A\\+|Det|Pron|Pcle|Adv|Interj|CC|CS|Pred");

    private Map<String, MutableInt> idCounts = new HashMap<>();
    // pattern for the clues
    private final Pattern cluePattern = Pattern.compile("Pr$");
    // the following tags are allowed between clue and noun
    private final Pattern validCluePattern = Pattern.compile("A\\+|Det|Adv");

    private String clueID = "";

    private int tokensBetweenClueAndHit = -1;

    private boolean isValidClue = false;

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

        CGToken clueCGToken = checkForClue(cgToken);

        if(hitCGToken != null){
            processHit(cgToken, cas);
        }
        else if(clueCGToken != null){
            processClue(cgToken, cas);
        }

        tokensBetweenClueAndHit++;
    }

    /**
     * Checks if a reading can be selected as clue.
     * Selects first match, but continues to check the
     * remaining readings in case of a contradicting reading.
     *
     * @param cgToken the reading being checked
     */
    private CGToken checkForClue(CGToken cgToken) {
        String firstReading = cgToken.getFirstReading();
        String allReadings = cgToken.getAllReadings();

        if(cluePattern.matcher(firstReading).find()){
            tokensBetweenClueAndHit = -1;
            isValidClue = true;
            return cgToken;
        }

        if(isValidClue &&
                !validCluePattern.matcher(allReadings).find() &&
                !posPattern.matcher(allReadings).find()){
            isValidClue = false;
            return null;
        }

        return null;
    }

    /**
     * A hit was selected and is being processed here. Create a
     * view enhancement tag containing:
     * - id
     * - lemma
     * - correctForm
     * - distractors
     * - clueid if present
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

        if(tokensBetweenClueAndHit < 4 && isValidClue){
            enhancement.addAttribute("clueid", clueID);
        }

        isValidClue = false;

        enhancement.addToCas(cas);
    }

    /**
     * A clue was selected and is being processed here. Create a
     * view enhancement tag containing:
     * - id
     * - class viewcluetag
     *
     * @param cgToken the cg token the reading was selected from
     * @param cas the current cas
     */
    private void processClue(CGToken cgToken, ConvenientCas cas) {
        final String id = enhancerUtils.getId(cgToken.getFirstReading(), idCounts);
        clueID = id;
        new ViewEnhancement(cgToken)
                .addAttribute("id", id)
                .addAttribute("type", "clue")
                .addToCas(cas);
    }
}
