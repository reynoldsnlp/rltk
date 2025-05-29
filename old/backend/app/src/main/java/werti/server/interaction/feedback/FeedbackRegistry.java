package werti.server.interaction.feedback;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Inject;
import com.google.inject.name.Named;
import werti.Language;

import java.util.Map;
import java.util.Optional;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-04-22
 */
public class FeedbackRegistry {
    private final Map<Language, FeedbackEngine> engines;

    @Inject
    public FeedbackRegistry(
            @Named("russian-feedback") FeedbackEngine russianEngine
    ) {
        this.engines = ImmutableMap.of(
                Language.RUSSIAN, russianEngine
        );
    }

    public Optional<FeedbackEngine> getEngineFor(Language language) {
        return Optional.ofNullable(engines.get(language));
    }
}
