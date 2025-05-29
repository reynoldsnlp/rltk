package werti.uima.fit.dkpro;

import de.tudarmstadt.ukp.dkpro.core.matetools.MateLemmatizer;
import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.resource.ResourceInitializationException;
import werti.uima.DescriptionGenerator;

import java.util.Map;

import static org.apache.uima.fit.factory.AnalysisEngineFactory.createEngineDescription;

/**
 * A configured Mate lemmatizer description mostly useful for German.
 *
 * It uses <tt>uppercase = true</tt>, which, according to the documentation
 * <blockquote>
 *         [tries] reconstructing proper casing for lemmata. This is useful for German, but e.g. for English creates
 *         odd results.
 * </blockquote>
 *
 * @author Aleksandar Dimitrov
 * @since 2017-06-04
 */
public class MateLemmatizerDescription implements DescriptionGenerator {
    @Override
    public AnalysisEngineDescription produce(Map<String, String> configuration) throws ResourceInitializationException {
        final AnalysisEngineDescription description = createEngineDescription(
                MateLemmatizer.class,
                "uppercase", false
        );

        configure(description, configuration);
        return description;
    }
}
