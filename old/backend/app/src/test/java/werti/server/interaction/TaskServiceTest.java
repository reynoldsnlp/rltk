package werti.server.interaction;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.ExpectedException;
import werti.endtoend.topics.TestTopics;
import werti.server.analysis.ViewRequestException;
import werti.server.interaction.authentication.AuthenticationData;
import werti.server.interaction.authentication.AuthenticationException;
import werti.server.interaction.authentication.AuthenticationService;
import werti.server.interaction.data.Task;
import werti.server.interaction.authentication.User;
import werti.server.interaction.storage.StorageEngine;
import werti.server.interaction.storage.TaskStorage;
import werti.server.interaction.transfer.TaskRequestData;
import werti.server.interaction.transfer.TrackingRequestData;

import java.util.Date;
import java.util.Optional;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;
import static org.mockito.Mockito.*;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-29
 */
public class TaskServiceTest {
    @Rule
    public ExpectedException thrown = ExpectedException.none();

    private AuthenticationService authService;
    private TaskStorage storage;
    private TaskService sut;
    private TaskRequestData.Builder requestDataBuilder;
    private TrackingRequestData.Builder trackingDataBuilder;
    private StorageEngine storageEngine;
    private User user;

    @Before
    public void setUp() throws Exception {
        final H2TestDatabase testDb = new H2TestDatabase();
        storageEngine = testDb.getTestDatabase();
        storage = storageEngine.getTaskStorage();

        authService = mock(AuthenticationService.class);
        sut = new TaskService(TestTopics.getMockTopics(), authService, storage);

        final Date now = new Date(System.currentTimeMillis());
        user = testDb.newUser();

        requestDataBuilder = TaskRequestData
                .builder()
                .topic("determiners")
                .activity("color")
                .language("en")
                .filter("any")
                .authenticationToken("you shall pass")
                .numberOfExercises(12)
                .url("http://example.com")
                .title("Test test test")
                .timestamp(now.getTime());

        trackingDataBuilder = TrackingRequestData
                .builder()
                .authenticationToken("you shall pass")
                .correctAnswer("Foo")
                .enhancementId("Foo")
                .submission("foo")
                .isCorrect(true)
                .usedSolution(true)
                .sentence("Foo")
                .timestamp(now.getTime());
    }

    @After
    public void tearDown() throws Exception {
        storageEngine.close();
    }

    @Test
    public void createsValidSessionsAndStoresThem() throws Exception {
        // given
        final TaskRequestData taskRequestData = requestDataBuilder.build();
        when(authService.authenticate(taskRequestData)).thenReturn(user);

        // when
        final Task result = sut.newTask(taskRequestData);

        // then
        assertThat(
                "The task storage should contain a the task under the expected key",
                storage.query(result.taskId(), user),
                is(Optional.of(result))
        );
    }

    @Test
    public void failOnUnauthenticatedUser() throws Exception {
        // given
        final TaskRequestData taskRequestData = requestDataBuilder.build();
        when(authService.authenticate(taskRequestData))
                .thenThrow(new AuthenticationException("Test exception."));

        thrown.expect(AuthenticationException.class);

        // when
        sut.newTask(taskRequestData);
    }

    @Test
    public void rejectTrackingDataForInvalidTask() throws Exception {
        // given
        final TaskRequestData taskRequestData = requestDataBuilder.build();
        when(authService.authenticate(any(AuthenticationData.class))).thenReturn(user);
        sut.newTask(taskRequestData); // there will be one task in the database
        final TrackingRequestData invalidTrackingData = trackingDataBuilder
                .taskId(2) // but it won't have the right id.
                .build();

        // when
        thrown.expect(ViewRequestException.class);
        sut.getTaskForUser(invalidTrackingData, user);
    }

    @Test
    public void validatesValidSessionsWithCorrectUser() throws Exception {
        //given task
        final TaskRequestData taskRequestData = requestDataBuilder.build();
        when(authService.authenticate(any(AuthenticationData.class))).thenReturn(user);
        final Task registeredTask = sut.newTask(taskRequestData);

        // and tracking request
        final TrackingRequestData validRequestData = trackingDataBuilder
                .taskId(registeredTask.taskId()).build();
        final Task validatedTask = sut.getTaskForUser(validRequestData, user);

        // then
        assertThat(
                "The task we get from validation should be the same as the created one",
                validatedTask,
                is(registeredTask)
        );
    }
}
