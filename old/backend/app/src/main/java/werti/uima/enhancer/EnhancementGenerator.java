package werti.uima.enhancer;

import werti.server.data.ViewConfigurationException;
import werti.server.enhancement.Enhancement;
import werti.uima.ConvenientCas;

import java.util.List;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-12-10
 */
public interface EnhancementGenerator {
    List<Enhancement> enhance(ConvenientCas cas) throws ViewConfigurationException;
}
