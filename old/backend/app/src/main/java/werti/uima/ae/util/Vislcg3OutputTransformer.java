package werti.uima.ae.util;

import org.apache.uima.jcas.JCas;
import org.apache.uima.jcas.cas.EmptyStringList;
import org.apache.uima.jcas.cas.FSArray;
import org.apache.uima.jcas.cas.NonEmptyStringList;
import werti.uima.types.annot.CGReading;
import werti.uima.types.annot.CGToken;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import static werti.uima.ae.Vislcg3Annotator.CG_SENTENCE_BOUNDARY_TOKEN;

/**
 * This utility class is used to transform output from vislcg3 into a list of CGTokens.
 * @author Eduard Schaf
 * @since 13.12.16
 */
public class Vislcg3OutputTransformer {

    private Vislcg3OutputTransformer() {
        throw new IllegalAccessError("Utility class");
    }

    /**
     * Transforms output from vislcg3 into a list of hfst CGTokens.
     *
     * @param vislcg3Output the data obtained from the vislcg3 process
     * @param jcas the current jcas
     * @return a list of CGTokens each containing a list of readings
     */
    public static List<CGToken> toHFSTCGTokenList(String vislcg3Output, JCas jcas) {
        List<CGToken> cgTokenList = new ArrayList<>();

        // current token and its readings
        CGToken currentCGToken = null;

        // read output line by line, eat multiple newlines
        String[] vislcg3OutputLines = vislcg3Output.split("\\n+");
        for (String vislcg3OutputLine : vislcg3OutputLines) {
            // case 1: new cohort
            if (vislcg3OutputLine.startsWith("\"<")) {
                // save previous token
                updateHFSTCGTokenList(cgTokenList, currentCGToken);
                // create new token
                currentCGToken = new CGToken(jcas);

                currentCGToken.setFirstReading("");
                currentCGToken.setAllReadings("");
                currentCGToken.setAllRuledOutReadings("");
                // case 2: a reading in the current cohort
            } else {
                // split reading line into features
                String[] features = vislcg3OutputLine.split("\\s+");

                // add the reading to the cg token
                addHFSTReadingToCGToken(features, currentCGToken);
            }
        }
        // save last token
        updateHFSTCGTokenList(cgTokenList, currentCGToken);
        return cgTokenList;
    }

    /**
     * Transforms output from vislcg3 into a list of Gerund CGTokens.
     *
     * @param vislcg3Output the data obtained from the vislcg3 process
     * @param jcas the current jcas
     * @return a list of CGTokens each containing a list of readings
     */
    public static List<CGToken> toGerundCGTokenList(String vislcg3Output, JCas jcas) {
        List<CGToken> cgTokenList = new ArrayList<>();

        // current token and its readings
        CGToken currentCGToken = null;

        List<CGReading> currentCGReadings = new ArrayList<>();

        // read output line by line, eat multiple newlines
        String[] vislcg3OutputLines = vislcg3Output.split("\\n+");
        for (int lineCount = 0; lineCount < vislcg3OutputLines.length; lineCount++) {
            String vislcg3OutputLine = vislcg3OutputLines[lineCount];
            // take out SENT-END tokens
            if (vislcg3OutputLine.startsWith("\"" + CG_SENTENCE_BOUNDARY_TOKEN + "\"")) {
                // skip the following line, too
                lineCount++;
                continue;
            }
            // case 1: new cohort
            if (vislcg3OutputLine.startsWith("\"<")) {
                // save previous token
                updateGerundCGTokenList(cgTokenList, currentCGToken, currentCGReadings, jcas);
                // create new token
                currentCGToken = new CGToken(jcas);
                currentCGReadings = new ArrayList<>();
                // case 2: a reading in the current cohort
            } else {
                // split reading line into features
                String[] features = vislcg3OutputLine.split("\\s+");

                // add the reading
                currentCGReadings.add(createGerundCGReading(features, jcas));
            }
        }
        // save last token
        updateGerundCGTokenList(cgTokenList, currentCGToken, currentCGReadings, jcas);
        return cgTokenList;
    }

    /**
     * Updates the hfst cg token list with a cg token.
     *
     * @param cgTokenList the list to update
     * @param cgToken the cg token added to the list
     */
    private static void updateHFSTCGTokenList(List<CGToken> cgTokenList, CGToken cgToken){
        if (cgToken != null) {
            cgTokenList.add(cgToken);
        }
    }

    /**
     * Updates the Gerund cg token list with a cg token
     * containing cg readings.
     *
     * @param cgTokenList the list to update
     * @param cgToken the cg token added to the list
     * @param cgReadings the readings added to the cg token
     * @param jcas the current jcas
     */
    private static void updateGerundCGTokenList(
            List<CGToken> cgTokenList,
            CGToken cgToken,
            List<CGReading> cgReadings,
            JCas jcas){

        if (cgToken != null) {
            cgToken.setReadings(new FSArray(jcas, cgReadings.size()));

            IntStream
                    .range(0, cgReadings.size())
                    .forEach(i -> cgToken.setReadings(i, cgReadings.get(i)));

            cgTokenList.add(cgToken);
        }
    }

    /**
     * Add a hfst reading consisting of features to the cg token.
     *
     * @param features the features the reading has
     * @param cgToken the cg token the reading is being add to
     */
    private static void addHFSTReadingToCGToken(String[] features, CGToken cgToken){

        String lemmaWithQuotes = features[1];

        // remove the quotes around the lemma
        String lemma = lemmaWithQuotes.substring(1, lemmaWithQuotes.length() - 1);

        String featuresString = IntStream
                .range(0, features.length)
                .filter(i -> i != 1) // skip lemma
                .mapToObj(i -> features[i])
                .collect(Collectors.joining("+"));

        if (cgToken.getFirstReading().isEmpty()) {
            cgToken.setLemma(lemma);

            cgToken.setFirstReading(featuresString);

            cgToken.setAllReadings(lemma.concat(featuresString));
        }
        else{ // 2nd to nth reading
            if(featuresString.startsWith(";")){
                cgToken.setAllRuledOutReadings(
                        cgToken
                                .getAllRuledOutReadings()
                                .concat(" ")
                                .concat(featuresString.replace(";", ";".concat(lemma))));
            }
            else{
                cgToken.setAllReadings(
                        cgToken
                                .getAllReadings()
                                .concat(" ")
                                .concat(lemma)
                                .concat(featuresString));
            }
        }
    }

    /**
     * Create a Gerund cg reading from an array of features.
     * Currently used for Gerunds.
     *
     * @param features the features the cg reading consists of
     * @param jcas the current jcas
     * @return a new cg reading with features
     */
    private static CGReading createGerundCGReading(String[] features, JCas jcas){
        CGReading cgReading = new CGReading(jcas);

        cgReading.setTail(new EmptyStringList(jcas));
        cgReading.setHead(features[features.length - 1]);
        // iterate backwards due to UIMAs prolog list disease
        for (int i = features.length - 2; i >= 0; i--) {
            if ("".equals(features[i])) {
                break;
            }
            // in order to extend the list, we have to set the old one as tail and the new element as head
            NonEmptyStringList old = cgReading;
            cgReading = new CGReading(jcas);
            cgReading.setTail(old);
            cgReading.setHead(features[i]);
        }
        return cgReading;
    }
}
