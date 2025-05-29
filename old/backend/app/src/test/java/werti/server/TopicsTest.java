package werti.server;

import com.google.gson.Gson;
import com.google.inject.Guice;
import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.name.Named;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.data.Topic;
import werti.server.data.Topics;
import werti.server.modules.TopicModule;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collection;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

/**
 * @author Aleksandar Dimitrov
 * @since 2016-10-16
 */
public class TopicsTest {
    @Inject @Named("view-gson")
    private Provider<Gson> gsonProvider;
    @Inject
    private Provider<Topics> topicsProvider;

    @Before
    public void setUp() throws Exception {
        Guice.createInjector(
                new TopicModule()
        ).injectMembers(this);
    }

    @Test
    public void testFileLoading() throws Exception {
        final Path basePath = Paths.get("src/test/resources/topics");
        final Collection<Topic> topics = Topics.getAllTopicFiles(
                basePath,
                gsonProvider.get()
        );
        assertEquals("There are exactly two test topics", 2, topics.size());
    }

    @Test
    public void testProvider() throws Exception {
        final Topics topics = topicsProvider.get();
        assertTrue(
                "There's more than one English Topic obtained via the provider.",
                topics.getTopicsFor(Language.ENGLISH).size() > 0
        );
    }
}
