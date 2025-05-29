package werti.server.data;

import com.google.gson.Gson;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.trimou.util.ImmutableList;
import werti.Language;
import werti.server.analysis.ViewRequestException;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import static werti.util.Streams.toOnlyElement;

/**
 * Container for the topic collection, with convenience methods to query the topic
 * database and static helper methods to read topic collections from disk.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-14
 */
public class Topics {
    private static final Logger log = LogManager.getLogger();

    private final Collection<Topic> topicList;

    public Topics(Collection<Topic> topicList) {
        this.topicList = topicList;
    }

    public Optional<Topic> get(String topicName, Language language) {
        return getTopicsFor(language).stream()
                .filter(topic -> topic.topic().equals(topicName))
                .reduce(toOnlyElement());
    }

    public Collection<Topic> getTopicsFor(Language language) {
        return this.topicList.stream()
                .filter(topic -> topic.getPipelineFor(language).isPresent())
                .collect(Collectors.toList());
    }

    public TaskData getTaskData(
            final String languageCode,
            final String topicName,
            final String activityName,
            final String filter
    ) throws ViewRequestException {
        final Language language = Language.fromIsoCode(languageCode).orElseThrow(
                () -> new ViewRequestException("Unknown language code: " + languageCode)
        );

        final Topic topic = get(topicName, language).orElseThrow(
                () -> new ViewRequestException("Topic " + topicName + "unknown for " + languageCode)
        );

        final Activity activity = topic.selectActivity(activityName).orElseThrow(
                () -> new ViewRequestException(
                        "Activity " + activityName + " not specified for " + topicName
                ));

        return TaskData.create(language, topic, activity, filter);
    }

    public static Collection<Topic> getAllTopicFiles(
            Path basePath,
            final Gson gson
    ) {
        final List<Topic> topics = new ArrayList<>();
        try {
            final List<Path> jsonPaths = Files.walk(basePath)
                                              .filter(path->path.toString().endsWith("json"))
                                              .collect (Collectors.toList());
            for (final Path json : jsonPaths) {
                loadTopicFrom(json, gson).ifPresent(topics::add);
            }
        } catch (IOException e) {
            log.error("CRITICAL: Error while loading topics. Proceeding without any topics!", e);
            return ImmutableList.of();
        }

        return topics;
    }

    private static Optional<Topic> loadTopicFrom(final Path path, final Gson gson) {
        try (Reader jsonReader = Files.newBufferedReader(path))
        {
            return Optional.of(gson.fromJson(jsonReader, Topic.class));
        } catch (IOException e) {
            log.error("Error while parsing " + path, e);
            return Optional.empty();
        }
    }
}
