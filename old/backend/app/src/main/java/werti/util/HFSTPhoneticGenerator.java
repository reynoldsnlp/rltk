package werti.util;

import fi.seco.hfst.Transducer;
import werti.Language;
import werti.resources.CachingResource;
import werti.resources.FileBackedResourceFactory;
import werti.resources.HfstResourceLoader;
import werti.resources.NoResourceException;

import javax.annotation.Nonnull;
import java.util.Set;

import static werti.util.HFSTAnalysis.analyseFeatures;

/**
 * This class uses finite state technology to lookup
 * phonological information.
 *
 * Specifically the HFSTG2P expects a lemma, possibly with
 * an appended character sequence denoting specific grammatical
 * features and creates a set of phonetic forms.
 *
 * @author Eduard Schaf
 * @since 14.12.16
 */
public class HFSTPhoneticGenerator {
    private Transducer transducer;

    /**
     * The constructor needed to activate the hfst-generator for a
     * given {@code language}.
     *
     * @param resourceFactory the factory the hfst-generator is stored in
     * @param language the language for the hfst-generator
     * @throws NoResourceException when there is a problem reading the file
     * defined in VIEW.properties with hfst.generator.{@code language}
     */
    public HFSTPhoneticGenerator(
            @Nonnull FileBackedResourceFactory resourceFactory,
            final Language language
    ) throws NoResourceException {
        final CachingResource resource = resourceFactory.create("hfst.phoneticgenerator");
        this.transducer = resource.requestFromStream(
                language,
                new HfstResourceLoader(),
                Transducer.class
        );
    }

    /**
     * Run the transducer on a lemma with appended grammatical feature indicators.
     *
     * @param lemmaWithFeatures the lemma with appended grammatical feature indicators
     * @return a set of generated word forms
     */
    public Set<String> runTransducer(String lemmaWithFeatures) {
        return analyseFeatures(this.transducer, lemmaWithFeatures);
    }
}