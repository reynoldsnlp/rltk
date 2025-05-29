package werti.util;

import fi.seco.hfst.Transducer;
import werti.Language;
import werti.resources.CachingResource;
import werti.resources.FileBackedResourceFactory;
import werti.resources.HfstResourceLoader;
import werti.resources.NoResourceException;
import werti.uima.types.annot.Token;

import javax.annotation.Nonnull;
import java.util.Collection;
import java.util.stream.Collectors;

import static werti.util.HFSTAnalysis.analyseWordForm;

/**
 * This class uses finite state technology to lookup
 * morphological information.
 *
 * Specifically the HFSTAnalyserMal expects a word form
 * or a list of word forms and creates a string with tab
 * delimited word form and a lemma combined with "+"
 * delimited string of features for each reading per line
 * for this word form. The result can be converted into
 * vislcg3 usable format via cg-conv.
 *
 * This analyser is able to deal with incorrect input because
 * mal rules are included. This is limited to one wrong
 * letter and the error types L2_Pal, L2_FV and L2_NoFV.
 *
 * @author Eduard Schaf
 * @since 10.09.17
 */
public class HFSTAnalyserMal {
    private static final String NEWLINE = System.lineSeparator();
    private Transducer transducer;

    /**
     * The constructor needed to activate the hfst-analyser-mal for a
     * given {@code language}.
     *
     * @param resourceFactory the factory the hfst-analyser-mal is stored in
     * @param language the language for the hfst-analyser-mal
     * @throws NoResourceException when there is a problem reading the file
     * defined in VIEW.properties with hfst.analyser-mal.{@code language}
     */
    public HFSTAnalyserMal(
            @Nonnull FileBackedResourceFactory resourceFactory,
            final Language language
    ) throws NoResourceException {
        final CachingResource resource = resourceFactory.create("hfst.analyser-mal");
        this.transducer = resource.requestFromStream(
                language,
                new HfstResourceLoader(),
                Transducer.class
        );
    }

    /**
     * Run the transducer meant for multiple elements.
     *
     * @param wordFormList the list of word forms
     * @return a string with tab delimited word form and a lemma combined
     * with "+" delimited string of features for each reading per line
     * while the analyses of each word form is separated by a new line.
     */
    public String runTransducer(Collection<Token> wordFormList) {
        return wordFormList.stream()
                .map(token -> analyseWordForm(this.transducer, token.getCoveredText()))
                .collect(Collectors.joining(NEWLINE));
    }

    /**
     * Run the transducer meant for a single element.
     *
     * @param wordForm the word form
     * @return a string with tab delimited word form and a lemma combined
     * with "+" delimited string of features for each reading per line
     */
    public String runTransducer(String wordForm) {
        return analyseWordForm(this.transducer, wordForm);
    }
}
