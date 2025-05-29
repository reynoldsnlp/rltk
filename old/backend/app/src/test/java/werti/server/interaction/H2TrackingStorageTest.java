package werti.server.interaction;

import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import werti.Language;
import werti.server.data.Activity;
import werti.server.data.TaskData;
import werti.server.data.Topic;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.Submission;
import werti.server.interaction.data.Task;
import werti.server.interaction.data.TaskPerformance;
import werti.server.interaction.data.WebPage;
import werti.server.interaction.storage.StorageEngine;
import werti.server.interaction.storage.TrackingStorage;

import java.net.URL;
import java.util.Date;
import java.util.Optional;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static werti.server.interaction.feedback.FeedbackMessage.EXACT_MATCH;
import static werti.server.interaction.feedback.FeedbackMessage.WRONG_SPELLING;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-24
 */
public class H2TrackingStorageTest {
    private StorageEngine storageEngine;
    private TrackingStorage storage;
    private Task task;

    @Before
    public void setUp() throws Exception {
        final H2TestDatabase testDatabase = new H2TestDatabase();
        storageEngine = testDatabase.getTestDatabase();
        storage = storageEngine.getTrackingStorage();

        final User user = testDatabase.newUser();
        final Topic topic = mock(Topic.class);
        when(topic.topic()).thenReturn("articles");

        final Activity activity = mock(Activity.class);
        when(activity.activity()).thenReturn("color");

        task = storageEngine.getTaskStorage().store(
                TaskData.create(Language.ENGLISH, topic, activity, "any"),
                99,
                WebPage.create(new URL("http://example.com"), "test page"),
                user,
                new Date()
        );
    }

    @After
    public void tearDown() throws Exception {
        storageEngine.close();
    }

    @Test
    public void queryingForNonexistentTaskReturnsEmptyList() throws Exception {
        assertThat(
                "Without first storing the entry, we should get an empty list",
                storage.getTaskLogEntries(task).isEmpty()
        );

        assertThat(
                "Without first storing the entry, we should get no performance",
                not(storage.getPerformance(task, "someEnhancement").isPresent())
        );
    }

    @Test
    public void savesAndRetrievesLogEntriesAndPerformance() throws Exception {
        final String enhancementId = "someId";
        final Submission entry = Submission.create(
                task,
                enhancementId,
                new Date(),
                "bar",
                WRONG_SPELLING,
                "Feedback"
        );
        final TaskPerformance performance = TaskPerformance.create(
                enhancementId,
                task,
                "bar",
                1,
                false,
                "foo",
                WRONG_SPELLING
        );

        storage.updateProgress(entry, performance);

        assertThat(
                "The saved performance entry should be the same as the committed one",
                storage.getPerformance(task, enhancementId),
                is(Optional.of(performance))
        );

        final Submission secondEntry = Submission.create(
                task,
                enhancementId,
                new Date(),
                "baz",
                EXACT_MATCH,
                "Feedback"
        );
        final TaskPerformance secondPerformance = TaskPerformance.create(
                enhancementId,
                task,
                "baz",
                2,
                true,
                "foo",
                EXACT_MATCH
        );

        storage.updateProgress(secondEntry, secondPerformance);

        assertThat(
                "Both saved log entries should be there",
                storage.getTaskLogEntries(task),
                contains(entry, secondEntry)
        );

        assertThat(
                "The performance entry should have been updated",
                storage.getPerformance(task, enhancementId),
                is(Optional.of(secondPerformance))
        );
    }
}
