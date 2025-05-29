package werti.server.servlet;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import io.restassured.response.Response;
import org.junit.Before;
import org.junit.Test;
import werti.server.interaction.authentication.AuthenticationData;
import werti.server.interaction.authentication.User;
import werti.server.interaction.data.SubmissionResponse;
import werti.server.interaction.transfer.PerformanceResponseData;
import werti.server.interaction.transfer.TaskRequestData;
import werti.server.interaction.transfer.TaskResponseData;
import werti.server.interaction.transfer.TrackingRequestData;
import werti.server.modules.ViewGson;
import werti.server.support.WithJetty;

import java.lang.reflect.Type;
import java.util.Date;
import java.util.List;

import static io.restassured.RestAssured.expect;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * @author Aleksandar Dimitrov
 * @since 2017-01-28
 */
public class TaskAndTrackerAcceptanceTest extends WithJetty {
    private String TASK_ENDPOINT = "/act/task";
    private String TRACK_ENDPOINT = "/act/tracking";
    private Gson gson;
    private TaskRequestData taskRequestData;
    private final String token = "you-shall-pass";

    @Before
    public void setUp() throws Exception {
        gson = new ViewGson().getGson();

        final User user = testDatabase.newUser();
        when(authenticationService.authenticate(any(AuthenticationData.class)))
                .thenReturn(user);

        taskRequestData =
                TaskRequestData.builder()
                               .authenticationToken(token)
                               .url("http://example.com")
                               .title("Test test test")
                               .topic("determiners")
                               .activity("click")
                               .language("en")
                               .filter("any")
                               .timestamp(new Date().getTime())
                               .numberOfExercises(23)
                               .build();
    }

    @Test
    public void canRequestToListPreviousTasks()  throws Exception {
        createTask();
        createTask();

        final String response = expect()
                .response().statusCode(200)
                .when().get(TASK_ENDPOINT + "?token=" + token)
                .getBody().asString();

        System.out.println(response);
        final Type listType = new TypeToken<List<TaskResponseData>>(){}.getType();
        final List<TaskResponseData> taskList = gson.fromJson(response, listType);

        assertThat(
                "There should be two tasks in the list",
                taskList.size(),
                is(2)
        );
    }

    @Test
    public void canRequestTrackingData()  throws Exception {
        final TaskResponseData taskData = createTask();
        track(taskData, "foo");
        track(taskData, "foo");
        track(taskData, "bar");

        final String response = expect()
                .response().statusCode(200)
                .when().get(TRACK_ENDPOINT + "?token=" + token + "&taskId=" + taskData.taskId())
                .getBody().asString();

        System.out.println(response);
        final Type listType = new TypeToken<List<PerformanceResponseData>>(){}.getType();
        final List<PerformanceResponseData> performanceList = gson.fromJson(response, listType);

        assertThat(
                "There should be performance entries for two enhancement ids",
                performanceList.size(),
                is(2)
        );
    }

    @Test
    public void canRequestSessionToken() throws Exception {
        final TaskResponseData firstTask = createTask();
        final TaskResponseData secondTask = createTask();

        assertThat(
                "The id on the second call should be different",
                firstTask.taskId(),
                not(secondTask.taskId())
        );

        final SubmissionResponse submissionResponse = track(firstTask, "foo");

        assertThat(
                "The response should indicate just one attempt",
                submissionResponse.performanceResponseData().numberOfTries(),
                is(1)
        );
    }

    private SubmissionResponse track(
            TaskResponseData task,
            String enhancementId
    ) throws Exception {
        final int taskId = task.taskId();

        final TrackingRequestData trackingRequestData =
                TrackingRequestData.builder()
                                   .authenticationToken("You shall pass")
                                   .taskId(taskId)
                                   .enhancementId(enhancementId)
                                   .submission("submission")
                                   .isCorrect(true)
                                   .correctAnswer("submission")
                                   .usedSolution(false)
                                   .timestamp(System.currentTimeMillis() / 1000L)
                                   .sentence("foo")
                                   .build();

        final Response trackingResponse =
                expect().response().statusCode(200)
                        .given().body(gson.toJson(trackingRequestData))
                        .when().post(TRACK_ENDPOINT);

        return gson.fromJson(
                trackingResponse.getBody().asString(),
                SubmissionResponse.class
        );
    }

    private TaskResponseData createTask() throws Exception {
        return gson.fromJson(
                expect().response().statusCode(200)
                        .given().body(gson.toJson(taskRequestData))
                        .when().post(TASK_ENDPOINT)
                        .body().asString(),
                TaskResponseData.class
        );
    }
}
