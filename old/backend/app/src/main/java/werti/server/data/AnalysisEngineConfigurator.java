package werti.server.data;

import org.apache.uima.analysis_engine.AnalysisEngineDescription;
import org.apache.uima.fit.factory.AnalysisEngineFactory;
import org.apache.uima.util.InvalidXMLException;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-15
 */
public class AnalysisEngineConfigurator {
    private final String descriptorLocation;
    private final Map<String, String> configuration;

    AnalysisEngineConfigurator(
            final String descriptorLocation,
            final Map<String, String> configuration
    ) {
        this.descriptorLocation = descriptorLocation;
        this.configuration = configuration;
    }

    private Object readValue(String value) {
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException e) { /* skip */ }
        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) { /* skip */ }
        final String canonical = value.toLowerCase();
        if ("true".equals(canonical)) {
            return Boolean.TRUE;
        }
        if ("false".equals(canonical)) {
            return Boolean.FALSE;
        }
        return value;
    }

    public AnalysisEngineDescription configure() throws ViewConfigurationException {
        final List<Object> flatConfiguration =
                configuration.entrySet().stream()
                             .flatMap(entry -> Stream.of(
                                     entry.getKey(),
                                     readValue(entry.getValue()))
                             ).collect(Collectors.toList());
        try {
            return AnalysisEngineFactory.createEngineDescription(
                    descriptorLocation,
                    flatConfiguration.toArray(new Object[flatConfiguration.size()])
            );
        } catch (InvalidXMLException | IOException e) {
            throw new ViewConfigurationException(e);
        }
    }
}
