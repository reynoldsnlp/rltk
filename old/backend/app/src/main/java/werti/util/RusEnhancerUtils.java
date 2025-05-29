package werti.util;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.uima.types.annot.CGToken;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author Eduard Schaf
 * @since 02.02.17
 */
public class RusEnhancerUtils {
    private static final Logger log = LogManager.getLogger();
    private static final Pattern superscriptPattern = Pattern.compile("[¹²³⁴⁵⁶⁷⁸⁹⁰]");

    /**
     * Get the superscript in the lemma, if present.
     *
     * @param lemma the lemma with potential superscript
     * @return the superscript if present, empty string otherwise
     */
    public String getSuperscript(String lemma) {
        Matcher superscriptMatcher = superscriptPattern.matcher(lemma);

        if(superscriptMatcher.find()){
            return superscriptMatcher.group();
        }
        else{
            return "";
        }
    }

    /**
     * Checks if a reading can be selected as hit.
     * Selects first match, but continues to check the
     * remaining readings in case of a contradicting reading.
     *
     * @param cgToken the cg token being checked
     * @param excludeTokenPattern the pattern excluding the token entirely
     * @param posPattern the pattern to find the pos
     * @param filterPattern the pattern to find the filters
     * @return the cg token, given that it matched the pos and filters,
     * null otherwise
     */
    public CGToken checkForHit(
            CGToken cgToken,
            Pattern excludeTokenPattern,
            Pattern posPattern,
            Pattern filterPattern) {
        String firstReading = cgToken.getFirstReading();
        String allReadings = cgToken.getAllReadings();

        if(excludeTokenPattern.matcher(allReadings).find()){
            return null;
        }

        if(posPattern.matcher(firstReading).find() &&
                filterPattern.matcher(firstReading).find()){
            return cgToken;
        }

        return null;
    }

    /**
     * Construct and get the view id based on the token features and
     * their occurrence in the text.
     *
     * @param features the features of the token
     * @param idCounts the map recording the id counts for enhancements
     * @return the full view id
     */
    public String getId(String features, Map<String, MutableInt> idCounts) {
        return "VIEW" + features.replace("+", "-") + "-" + getIDCount(idCounts, features);
    }

    /**
     * Retrieve the id count from the map. This is used
     * to create a unique id for each view enhancement tag.
     *
     * @param idCounts the map recording the id counts for enhancements
     * @param key the key to access the value of the id count
     * @return the id count from the map
     */
    private int getIDCount(Map<String, MutableInt> idCounts, String key) {
        MutableInt idCount = idCounts.get(key);
        if (idCount == null) {
            idCounts.put(key, new MutableInt());
        }
        else {
            idCount.increment();
        }
        return idCounts.get(key).get();
    }
}
