package werti.server;

import com.google.common.collect.ImmutableMap;
import com.google.gson.Gson;
import com.google.inject.Guice;
import com.google.inject.Inject;
import com.google.inject.Provider;
import com.google.inject.name.Named;
import org.apache.logging.log4j.LogManager;
import org.junit.Before;
import org.junit.Test;
import org.trimou.util.ImmutableList;
import werti.Language;
import werti.server.data.*;
import werti.server.modules.TopicModule;

import java.util.Collections;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;

/**
 * Integrates {@link Topic}, {@link Activity}, {@link Description}, and {@link Pipeline}.
 *
 * @author Aleksandar Dimitrov
 * @since 2016-10-14
 */
public class TopicIntegrationTest {
    private static final org.apache.logging.log4j.Logger log = LogManager.getLogger();
    @Inject @Named("view-gson") private Provider<Gson> gsonProvider;
    private Gson gson;
    private Topic topic;

    @Before
    public void setUp() throws Exception {
        Guice.createInjector(new TopicModule()).injectMembers(this);
        gson = gsonProvider.get();
        topic = Topic.builder()
                .authors(ImmutableList.of("Author"))
                .topic("topic")
                .description(new StringDescription("Topic title", "topic description"))
                .activities(ImmutableList.of(
                        Activity.builder()
                                .description(new StringDescription(
                                        "Activity title",
                                        "activity description"))
                                .activity("activity")
                                .enhancementDescription(
                                        EnhancerSettings.create(
                                                "werti.uima.types.annot.Token",
                                                Collections.emptyMap()
                                        )
                                )
                                .build()
                ))
                .pipelines(ImmutableList.of(Pipeline.create(
                        "desc/Pipeline.xml",
                        Language.ENGLISH,
                        ImmutableMap.of("option", "value")
                )))
                .build();
    }

    @Test
    public void correctlySelectActivity() {
        assertThat(
                "The specified test activity is present.",
                topic.selectActivity("activity").isPresent()
        );
        assertThat(
                "A missing activity is not present and doesn't throw an exception.",
                not(topic.selectActivity("missing activity").isPresent())
        );
    }

    @Test
    public void survivesSerialization() {
        final String json = gson.toJson(topic);
        final Topic deserializedTopic = gson.fromJson(json, Topic.class);
        assertThat(
                "Topic deep structure survives serialization and deserialization",
                topic,
                is(deserializedTopic)
        );
    }
}
