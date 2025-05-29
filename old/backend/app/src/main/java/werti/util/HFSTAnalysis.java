package werti.util;

import fi.seco.hfst.Transducer;
import fi.seco.hfst.Transducer.Result;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

/**
 * This class contains the analysis methods used
 * with a given transducer and either a lemma combined
 * with "+" delimited features or a word from as input.
 *
 * @author Eduard Schaf
 * @since 15.12.16
 */
public class HFSTAnalysis {

    private static final String NEWLINE = System.lineSeparator();

    private HFSTAnalysis() {
        throw new IllegalAccessError("Utility class");
    }

    /**
     * Analyse a word form with the provided transducer
     * to generate a string of features for each reading.
     *
     * @param transducer the transducer to be used
     * @param wordForm the word form
     * @return a string with tab delimited word form and a lemma combined
     * with "+" delimited string of features for each reading per line
     */
    public static String analyseWordForm(Transducer transducer, String wordForm) {
        StringBuilder analysesString = new StringBuilder();

        Collection<Result> analyses = transducer.analyze(wordForm);

        for (Result analysis : analyses){

            String symbols = String.join("", analysis.getSymbols());

            analysesString
                    .append(wordForm)
                    .append("\t")
                    .append(symbols)
                    .append(NEWLINE);
        }

        if (analyses.isEmpty()) {
            analysesString
                    .append(wordForm)
                    .append("\t+?")
                    .append(NEWLINE);
        }
        return analysesString.toString();
    }

    /**
     * Analyse a lemma combined with "+" delimited features
     * with the provided transducer to generate a set of word forms.
     *
     * @param transducer the transducer to be used
     * @param lemmaWithFeatures the lemma combined with "+" delimited features
     * @return a set of word forms
     */
    public static Set<String> analyseFeatures(Transducer transducer, String lemmaWithFeatures) {
        Set<String> wordFormSet = new HashSet<>();

        Collection<Result> analyses = transducer.analyze(lemmaWithFeatures);

        for (Result analysis : analyses){
            String wordForm = String.join("", analysis.getSymbols());

            wordFormSet.add(wordForm);
        }

        return wordFormSet;
    }
}
