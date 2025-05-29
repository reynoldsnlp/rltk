package werti.endtoend.topics;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import werti.Language;
import werti.server.analysis.ViewRequestException;
import werti.server.data.*;
import werti.server.modules.ViewGson;

import java.nio.file.Paths;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Convenience class to access the defined topics.
 *
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public class TestTopics {
    static Topics getRealTopics() {
        return new Topics(Topics.getAllTopicFiles(
                Paths.get("src/main/resources/topics"),
                new ViewGson().getGson())
        );
    }

    public static Topics getMockTopics() throws ViewRequestException {
        final Topics topics = mock(Topics.class);

        final Activity.Builder activity = Activity.builder()
                .description(new StringDescription("Test activity", "is this on?"))
                .enhancementDescription(EnhancerSettings.create("none", ImmutableMap.of()));

        final Topic.Builder topic = Topic.builder()
                .authors(ImmutableList.of())
                .pipelines(ImmutableList.of())
                .description(new StringDescription("Test topic", "is this on?"));

        when(topics.getTaskData(anyString(), anyString(), anyString(), anyString())).then(
                invocationOnMock -> {
                    final Activity theActivity =
                            activity.activity(invocationOnMock.getArgument(2)).build();
                    topic.activities(ImmutableList.of(theActivity))
                         .topic(invocationOnMock.getArgument(1));

                    return TaskData.create(
                            Language.fromIsoCode(invocationOnMock.getArgument(0)).get(),
                            topic.build(),
                            theActivity,
                            "any"
                    );
                });

        return topics;
    }
}
