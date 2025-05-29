package werti.server.views;

import com.google.inject.Inject;
import werti.Language;
import werti.server.data.Topic;
import werti.server.data.Topics;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-09-26
 */
public class DefaultView implements View {
    private final Topics topics;
    private final FirebaseApiData firebaseApiData;

    @Inject
    public DefaultView(
            final Topics topics,
            final FirebaseApiData firebaseApiData
    ) {
        this.topics = topics;
        this.firebaseApiData = firebaseApiData;
    }

    public List<TopicList> getTopicsByLanguage() {
        return getSupportedLanguages().stream()
                .map(language -> new TopicList(topics.getTopicsFor(language), language))
                .collect(Collectors.toList());
    }

    /**
     * Helper class to display topics with associated language information.
     */
    private static class TopicList {
        private final Language language;
        private final Collection<Topic> topicsByLanguage;

        TopicList(final Collection<Topic> topics, final Language language) {
            this.language = language;
            this.topicsByLanguage = topics;
        }

        public Collection<Topic> topics() {
            return this.topicsByLanguage;
        }

        public String getLanguageCode() {
            return language.toString();
        }
    }

    @Override
    public List<Language> getSupportedLanguages() {
        return Arrays.asList(Language.values());
    }

    @Override
    public FirebaseApiData getFirebaseApiData() {
        return firebaseApiData;
    }
}
