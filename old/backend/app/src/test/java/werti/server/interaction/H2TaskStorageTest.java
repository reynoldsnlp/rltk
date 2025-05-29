package werti.server.interaction;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import werti.Language;
import werti.server.data.Activity;
import werti.server.data.TaskData;
import werti.server.data.Topic;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.WebPage;
import werti.server.interaction.storage.StorageEngine;
import werti.server.interaction.storage.TaskStorage;

import java.net.URL;
import java.util.Date;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-02-19
 */
public class H2TaskStorageTest {
    @Rule
    public MockitoRule rule = MockitoJUnit.rule();

    private TaskStorage taskStorage;
    private User user;
    private StorageEngine storageEngine;

    @Mock private Activity activity;
    @Mock private Topic topic;
    private final Language language = Language.SPANISH;
    private H2TestDatabase testDatabase;

    @Before
    public void setUpConnection() throws Exception {
        testDatabase = new H2TestDatabase();
        storageEngine = testDatabase.getTestDatabase();

        user = testDatabase.newUser();

        taskStorage = storageEngine.getTaskStorage();
        when(activity.activity()).thenReturn("color");
        when(topic.topic()).thenReturn("articles");
    }

    @After
    public void tearDown() throws Exception {
        storageEngine.close();
    }

    @Test
    public void canStoreSessionAndRetrievedSessionObjectIsIdentical() throws Exception {
        // store
        final Task storedTask = taskStorage.store(
                TaskData.create(Language.ENGLISH, topic, activity, "any"),
                99,
                WebPage.create(new URL("http://example.com"), "test page"),
                user,
                new Date()
        );

        // query
        final Task retrievedTask = taskStorage.query(storedTask.taskId(), user)
                .orElseThrow(Exception::new);

        // assert equals
        assertThat(
                "Stored and retrieved tasks should be identical",
                storedTask,
                is(retrievedTask)
        );
    }

    private Task createTask(final User user) throws Exception {
        return taskStorage.store(
                TaskData.create(language, topic, activity, "any"),
                ThreadLocalRandom.current().nextInt(),
                WebPage.create(new URL("http://example.com"), "test page"),
                user,
                new Date()
        );
    }

    @Test
    public void canRetrieveAllTasksForACertainUser() throws Exception {
        final User user1 = testDatabase.newUser();
        final User user2 = testDatabase.newUser();

        final Task task1 = createTask(user1);
        final Task task2 = createTask(user2);
        final Task task3 = createTask(user1);

        assertEquals(
                "There should be two tasks for user 1",
                taskStorage.getTasksFor(user1).size(),
                2
        );

        assertEquals(
                "There should be just one task for user 2",
                taskStorage.getTasksFor(user2).size(),
                1
        );
    }

    @Test
    public void nonExistingTaskReturnsOptionalEmpty() throws Exception {
        final int someTaskId = 110;

        assertThat(
                "Querying for a nonexistent task should returen Optional.empty",
                taskStorage.query(someTaskId, user),
                is(Optional.empty())
        );
    }
}
