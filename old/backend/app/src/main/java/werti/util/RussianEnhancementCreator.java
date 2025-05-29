package werti.util;

import werti.server.enhancement.ViewEnhancement;
import werti.uima.types.annot.CGToken;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * @author Eduard Schaf
 * @author Aleksandar Dimitrov
 * @since 2017-04-14
 */
public class RussianEnhancementCreator {
    private final HFSTGenerator hfstGenerator;
    private final RusEnhancerUtils enhancerUtils;
    private final RusDistractorGenerator distractorGenerator;


    public RussianEnhancementCreator(
            final HFSTGenerator hfstGenerator,
            final RusEnhancerUtils enhancerUtils,
            final RusDistractorGenerator distractorGenerator
    ) {
        this.hfstGenerator = hfstGenerator;
        this.enhancerUtils = enhancerUtils;
        this.distractorGenerator = distractorGenerator;
    }


    /**
     * Create a view enhancement tag containing:
     * - id
     * - lemma
     * - correctForm
     * - distractors
     * - type
     * - filters
     *
     * @param cgToken the cg token the reading was selected from
     * @param idCounts the map recording the id counts for enhancements
     * @param topic the selected topic
     * @param filterPattern the pattern to find the filters
     * @return a common view enhancement tag
     */
    public ViewEnhancement createCommonEnhancement(
            CGToken cgToken,
            Map<String, MutableInt> idCounts,
            String topic,
            Pattern filterPattern) {
        String lemma = cgToken.getLemma();

        String hitFeatures = cgToken.getFirstReading();

        final ViewEnhancement enhancement = new ViewEnhancement(cgToken);
        enhancement.addAttribute("id", enhancerUtils.getId(hitFeatures, idCounts))
                   .addAttribute("lemma", lemma);

        addCorrectForm(enhancement, lemma, hitFeatures);

        addDistractors(enhancement, lemma, hitFeatures, topic);

        addTypeAndFilters(filterPattern, enhancement, cgToken.getAllReadings());

        return enhancement;
    }

    /**
     * Add the first form from the hit as correct form to the enhancement.
     *
     * @param enhancement the current enhancement element
     * @param lemma the lemma of the hit
     * @param hitFeatures the features of the hit
     */
    private void addCorrectForm(ViewEnhancement enhancement, String lemma, String hitFeatures) {
        // get the first form from the hit as correct form
        Set<String> correctFormSet = hfstGenerator.runTransducer(lemma + hitFeatures);
        String correctForm = correctFormSet.iterator().next();

        enhancement.addAttribute("correctForm", correctForm);
    }

    /**
     * Add distractors to the enhancement, if there are at least two
     * distractors.
     *
     * @param enhancement the current enhancement element
     * @param lemma the lemma of the hit
     * @param hitFeatures the features of the hit
     * @param topic the selected topic
     */
    private void addDistractors(
            ViewEnhancement enhancement,
            String lemma,
            String hitFeatures,
            String topic) {
        String distractors = distractorGenerator.createDistractors(lemma, hitFeatures, topic);

        // we only need distractors if there are at least two
        if(distractors.contains(";")){
            enhancement.addAttribute("distractors", distractors);
        }
    }

    /**
     * Add type and filters to the enhancement element.
     *
     * @param filterPattern the pattern to find the filters
     * @param enhancement the current enhancement element
     * @param allReadings all readings of the hit
     */
    private void addTypeAndFilters(Pattern filterPattern, ViewEnhancement enhancement, String allReadings){
        Set<String> filterSet = new HashSet<>();

        Matcher filterMatcher = filterPattern.matcher(allReadings);

        while(filterMatcher.find()){
            filterSet.add(filterMatcher.group());
        }

        if(filterSet.size() > 1){
            enhancement.addAttribute("type", "ambiguity");
        }
        else{
            enhancement.addAttribute("type", "hit");
        }

        String filters = filterSet
                .stream()
                .collect(Collectors.joining(" "));

        enhancement.addAttribute("filters", filters);
    }
}
