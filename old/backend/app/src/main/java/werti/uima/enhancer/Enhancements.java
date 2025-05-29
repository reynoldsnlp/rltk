package werti.uima.enhancer;

import werti.server.data.ViewConfigurationException;
import werti.server.enhancement.Enhancement;
import werti.server.enhancement.ViewEnhancement;
import werti.uima.ConvenientCas;
import werti.uima.types.EnhancementAnnotation;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Predicate;

import static java.util.stream.Collectors.toList;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-14
 */
public class Enhancements implements EnhancementGenerator {
    private final Predicate<ViewEnhancement> predicateSelector;

    public Enhancements(Map<String, String> configuration) {
        this.predicateSelector = configuration
                .entrySet().stream().map(this::match).reduce(Predicate::and)
                // When there are no predicates in config, we accept all enhancements
                .orElse(enhancement -> true);
    }

    private Predicate<ViewEnhancement> match(final Map.Entry<String, String> entry) {
        final String attribute = entry.getKey();
        final List<String> values = Arrays.asList(entry.getValue().split(" "));

        return enhancement -> enhancement
                .getAttribute(attribute)
                .map(values::contains)
                .orElse(false);
    }

    @Override
    public List<Enhancement> enhance(ConvenientCas cas) throws ViewConfigurationException {
        return cas.select(EnhancementAnnotation.class).stream()
                  .map(ViewEnhancement::new).filter(predicateSelector).collect(toList());
    }
}
