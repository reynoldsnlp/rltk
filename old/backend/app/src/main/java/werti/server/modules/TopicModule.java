package werti.server.modules;

import com.google.gson.Gson;
import com.google.inject.AbstractModule;
import com.google.inject.name.Names;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import werti.server.data.Topic;
import werti.server.data.Topics;

import java.net.URISyntaxException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-15
 */
public class TopicModule extends AbstractModule {
    private static final Logger log = LogManager.getLogger();
    private final Path topicPath;

    public TopicModule() {
        try {
            this.topicPath = Paths.get(ClassLoader.getSystemResource("topics").toURI());
        } catch (URISyntaxException e) {
            // This should never happen.™
            log.error("Couldn't get topics system resource, no topics available!", e);
            throw new RuntimeException("Can't proceed without topics!", e);
        }
    }

    public TopicModule(final Path topicPath) {
        this.topicPath = topicPath;
    }

    @Override
    protected void configure() {
        final Gson gson = new ViewGson().getGson();
        bind(Gson.class).annotatedWith(Names.named("view-gson")).toInstance(gson);
        bind(Topics.class).toInstance(createTopics(gson));
    }

    private Topics createTopics(final Gson gson) {
        log.info("Providing Topics from {}", this.topicPath);
        final Collection<Topic> topics = Topics.getAllTopicFiles(this.topicPath, gson);
        return new Topics(topics);
    }
}
