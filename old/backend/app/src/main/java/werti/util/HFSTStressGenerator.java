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
 * morphological information.
 *
 * Specifically the HFSTGenerator expects a string of
 * "+" delimited features creates a set of word forms
 * with stress marker.
 *
 * @author Eduard Schaf
 * @since 14.12.16
 */
public class HFSTStressGenerator {
    private Transducer transducer;

    /**
     * The constructor needed to activate the hfst-stress-generator for a
     * given {@code language}.
     *
     * @param resourceFactory the factory the hfst-stress-generator is stored in
     * @param language the language for the hfst-stress-generator
     * @throws NoResourceException when there is a problem reading the file
     * defined in VIEW.properties with hfst.stressgenerator.{@code language}
     */
    public HFSTStressGenerator(
            @Nonnull final FileBackedResourceFactory resourceFactory,
            final Language language
    ) throws NoResourceException {
        final CachingResource resource = resourceFactory.create("hfst.stressgenerator");
        this.transducer = resource.requestFromStream(
                language,
                new HfstResourceLoader(),
                Transducer.class
        );
    }

    /**
     * Run the transducer on the lemma combined with "+" delimited features.
     *
     * @param lemmaWithFeatures the lemma combined with "+" delimited features
     * @return a set of generated word forms with stress marker
     */
    public Set<String> runTransducer(String lemmaWithFeatures) {
        return analyseFeatures(this.transducer, lemmaWithFeatures);
    }
}
